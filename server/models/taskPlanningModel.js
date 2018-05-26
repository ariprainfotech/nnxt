import mongoose from 'mongoose'
import * as SC from '../serverconstants'
import AppError from '../AppError'
import momentTZ from 'moment-timezone'
import _ from 'lodash'
import moment from 'moment'
import * as EC from '../errorcodes'
import * as MDL from '../models'
import * as V from '../validation'
import logger from '../logger'

mongoose.Promise = global.Promise

let taskPlanningSchema = mongoose.Schema({
    user: {
        _id: mongoose.Schema.ObjectId,
        name: {type: String},
        role: {type: String},
    },
    created: {type: Date, default: Date.now()},
    planningDate: {type: Date, default: Date.now()},
    planningDateString: String,
    isShifted: {type: Boolean, default: false},
    description: {type: String},
    task: {
        _id: mongoose.Schema.ObjectId,
        name: {type: String, required: [true, 'Task name is required']},
    },
    release: {
        _id: mongoose.Schema.ObjectId,
    },
    releasePlan: {
        _id: mongoose.Schema.ObjectId,
    },
    employee: {
        _id: mongoose.Schema.ObjectId,
        name: {type: String, required: [true, 'employee name is required']},
    },
    flags: [{
        type: String,
        enum: [SC.WARNING_EMPLOYEE_ON_LEAVE, SC.WARNING_TOO_MANY_HOURS, SC.WARNING_UNREPORTED]
    }],
    planning: {
        plannedHours: {type: Number, default: 0}
    },
    report: {
        status: {
            type: String,
            enum: [SC.REPORT_UNREPORTED, SC.REPORT_COMPLETED, SC.REPORT_PENDING]

        },
        reasons: [{
            type: String,
            enum: [SC.REASON_GENRAL_DELAY, SC.REASON_EMPLOYEE_ON_LEAVE, SC.REASON_INCOMPLETE_DEPENDENCY, SC.REASON_NO_GUIDANCE_PROVIDED, SC.REASON_RESEARCH_WORK, SC.REASON_UNFAMILIAR_TECHNOLOGY]
        }],
        reportedHours: {type: Number, default: 0},
        comment: {
            comment: String,
            commentType: String
        },
    }
})


// Create new task plan
taskPlanningSchema.statics.addTaskPlanning = async (taskPlanningInput, user, schemaRequested) => {
    if (schemaRequested)
        return V.generateSchema(V.releaseTaskPlanningStruct)

    V.validate(taskPlanningInput, V.releaseTaskPlanningStruct)

    let userRole
    let release = await MDL.ReleaseModel.findById(taskPlanningInput.release._id)
    if (!release) {
        throw new AppError('Release not found', EC.NOT_FOUND, EC.HTTP_BAD_REQUEST)
    }

    let releasePlan = await MDL.ReleasePlanModel.findById(taskPlanningInput.releasePlan._id)
    if (!releasePlan) {
        throw new AppError('Release Plan not found', EC.NOT_FOUND, EC.HTTP_BAD_REQUEST)
    }

    //check user highest role in this release
    let userRoleInThisRelease = await MDL.ReleaseModel.getUserHighestRoleInThisRelease(release._id, user)
    if (!userRoleInThisRelease) {
        throw new AppError('User is not having any role in this release so don`t have any access', EC.ACCESS_DENIED, EC.HTTP_FORBIDDEN)
    }
    if (!_.includes([SC.ROLE_LEADER, SC.ROLE_MANAGER], userRoleInThisRelease)) {
        throw new AppError('Only user with role [' + SC.ROLE_MANAGER + ' or ' + SC.ROLE_LEADER + '] can plan task', EC.ACCESS_DENIED, EC.HTTP_FORBIDDEN)
    }

    let selectedDeveloper = await MDL.UserModel.findById(mongoose.Types.ObjectId(taskPlanningInput.employee._id)).exec()
    if (!selectedDeveloper) {
        throw new AppError('Developer Not Found', EC.NOT_FOUND, EC.HTTP_BAD_REQUEST)
    }


    let momentPlanningDate = momentTZ.tz(taskPlanningInput.planningDate, SC.DATE_FORMAT, SC.DEFAULT_TIMEZONE).hour(0).minute(0).second(0).millisecond(0)
    // Conversion of planned hours in number format
    let numberPlannedHours = Number(taskPlanningInput.planning.plannedHours)

    if (numberPlannedHours <= 0)
        throw new AppError('Planned hours need to be positive number', EC.BAD_ARGUMENTS, EC.HTTP_BAD_REQUEST)

    // checking that developer is part of project or not
    if (taskPlanningInput && !taskPlanningInput.projectUsersOnly) {
        // if not then it is added in non Project team of release

        /*
           [saurabh-review] - Manager/Leader would not be developer of a release until they were added as part of team so I don't think we need to check
           employee id against manager or leader id.
         */
        if (await MDL.ReleaseModel.count({
                '_id': release._id,
                $or: [{'manager._id': taskPlanningInput.employee._id},
                    {'leader._id': taskPlanningInput.employee._id},
                    {'team._id': taskPlanningInput.employee._id},
                    {'nonProjectTeam._id': taskPlanningInput.employee._id}]
            }) <= 0) {
            // it checks that user who may not be a developer of this project is assigned into a task plan so add that user to this project as a nonProjectTeam
            let nonProjectUser = {
                '_id': selectedDeveloper._id.toString(),
                'name': selectedDeveloper.firstName + ' ' + selectedDeveloper.lastName,
                'email': selectedDeveloper.email,
            }
            await MDL.ReleaseModel.update({
                '_id': mongoose.Types.ObjectId(release._id)
            }, {$push: {'nonProjectTeam': nonProjectUser}}).exec()
        }
    }

    // Add or update employee days details when task is planned
    // Check already added employees day detail or not
    if (await MDL.EmployeeDaysModel.count({
            'employee._id': selectedDeveloper._id.toString(),
            'date': momentPlanningDate
        }) > 0) {

        //  already added employees day detail so update employee days details with increment of planned hours
        let EmployeeDaysModelInput = {
            plannedHours: numberPlannedHours,
            employee: {
                _id: selectedDeveloper._id.toString(),
                name: selectedDeveloper.firstName + ' ' + selectedDeveloper.lastName
            },
            dateString: taskPlanningInput.planningDate,
        }
        await MDL.EmployeeDaysModel.increasePlannedHoursOnEmployeeDaysDetails(EmployeeDaysModelInput, user)
    } else {

        // not added employees day detail so add employee days details with planned hour
        let EmployeeDaysModelInput = {
            employee: {
                _id: selectedDeveloper._id.toString(),
                name: selectedDeveloper.firstName + ' ' + selectedDeveloper.lastName
            },
            plannedHours: numberPlannedHours,
            dateString: taskPlanningInput.planningDate,
        }
        await MDL.EmployeeDaysModel.addEmployeeDaysDetails(EmployeeDaysModelInput, user)
    }


    // Add or update Employee Statistics Details when task is planned
    // Check task detail available with same release and employee
    if (await MDL.EmployeeStatisticsModel.count({
            'employee._id': mongoose.Types.ObjectId(selectedDeveloper._id),
            'release._id': mongoose.Types.ObjectId(release._id),
            'tasks._id': mongoose.Types.ObjectId(releasePlan._id),

        }) > 0) {

        // Already added employees statics detail with task plan update inserted task plan hours of that task plan
        let EmployeeStatisticsModelInput = {
            release: {
                _id: release._id.toString(),
                version: release.name
            },
            employee: {
                _id: selectedDeveloper._id.toString(),
                name: selectedDeveloper.firstName + ' ' + selectedDeveloper.lastName
            },
            task: {
                _id: releasePlan._id.toString(),
                name: releasePlan.task.name,
                plannedHours: numberPlannedHours,
                reportedHours: Number(0),
                plannedHoursReportedTasks: Number(0)
            }
        }
        await MDL.EmployeeStatisticsModel.increaseTaskDetailsHoursToEmployeeStatistics(EmployeeStatisticsModelInput, user)

    } else if (await MDL.EmployeeStatisticsModel.count({
            'employee._id': mongoose.Types.ObjectId(selectedDeveloper._id),
            'release._id': mongoose.Types.ObjectId(release._id)
        }) > 0) {

        // Already added employees statics detail without task plan so add a task plan with planned hours
        let EmployeeStatisticsModelInput = {
            release: {
                _id: release._id.toString(),
                version: release.name
            },
            employee: {
                _id: selectedDeveloper._id.toString(),
                name: selectedDeveloper.firstName + ' ' + selectedDeveloper.lastName
            },
            task: {
                _id: releasePlan._id.toString(),
                name: releasePlan.task.name,
                plannedHours: numberPlannedHours,
                reportedHours: 0,
                plannedHoursReportedTasks: 0
            }
        }
        await MDL.EmployeeStatisticsModel.addTaskDetailsToEmployeeStatistics(EmployeeStatisticsModelInput, user)

    } else {
        // Not available employees statics detail so add employee statistics detail with task plan and planned hours

        let EmployeeStatisticsModelInput = {
            release: {
                _id: release._id.toString(),
                version: release.name
            },
            employee: {
                _id: selectedDeveloper._id.toString(),
                name: selectedDeveloper.firstName + ' ' + selectedDeveloper.lastName
            },
            leaves: [],
            tasks: [
                {
                    _id: releasePlan._id.toString(),
                    name: releasePlan.task.name,
                    plannedHours: numberPlannedHours,
                    reportedHours: 0,
                    plannedHoursReportedTasks: 0
                }
            ]
        }
        await MDL.EmployeeStatisticsModel.addEmployeeStatisticsDetails(EmployeeStatisticsModelInput, user)
    }

    /* As task plan is added we have to increase releasePlan planned hours
     */

    var releasePlanUpdateData = {
        $inc: {
            'planning.plannedHours': numberPlannedHours
        }
    }

    // Since a planning is added into release plan task, we would have to remove unplanned warning from this plan and also remove unplanned flag

    if (releasePlan.flags && releasePlan.flags.indexOf(SC.WARNING_UNPLANNED) > -1) {
        // remove flag and associated warning
        logger.debug('release plan has unplanned flag remove that flag as well as associated warning')
        releasePlanUpdateData['$pull'] = {flags: SC.WARNING_UNPLANNED}
        await MDL.WarningModel.removeUnplanned(releasePlan)

    }
    await MDL.ReleasePlanModel.update({'_id': mongoose.Types.ObjectId(releasePlan._id)}, releasePlanUpdateData)

    // As task plan is added we have to increase release planned hours

    await MDL.ReleaseModel.update(
        {'_id': mongoose.Types.ObjectId(release._id)},
        {
            $inc: {
                'initial.plannedHours': numberPlannedHours
            }
        })

    // creating new task plan
    let taskPlanning = new TaskPlanningModel()
    taskPlanning.created = Date.now()
    taskPlanning.planningDate = momentPlanningDate
    taskPlanning.planningDateString = taskPlanningInput.planningDate
    taskPlanning.task = taskPlanningInput.task
    taskPlanning.release = taskPlanningInput.release
    taskPlanning.releasePlan = taskPlanningInput.releasePlan
    taskPlanning.employee = taskPlanningInput.employee
    taskPlanning.planning = taskPlanningInput.planning
    taskPlanning.report = taskPlanningInput.report
    taskPlanning.description = taskPlanningInput.description ? taskPlanningInput.description : ''
    taskPlanning.user = {
        _id: user._id,
        name: user.firstName + ' ' + user.lastName,
        role: userRoleInThisRelease
    }
    return await taskPlanning.save()
}


//merge task plan to another date
taskPlanningSchema.statics.mergeTaskPlanning = async (taskPlanningInput, user, schemaRequested) => {
    if (schemaRequested)
        return V.generateSchema(V.releaseMergeTaskPlanningStruct)

    V.validate(taskPlanningInput, V.releaseMergeTaskPlanningStruct)

    //Conversion of now and dates into moment
    let now = new Date()
    let nowString = moment(now).format(SC.DATE_FORMAT)
    let nowMomentInUtc = momentTZ.tz(nowString, SC.DATE_FORMAT, SC.DEFAULT_TIMEZONE).hour(0).minute(0).second(0).millisecond(0)
    let rePlanningDateMoment = momentTZ.tz(taskPlanningInput.rePlanningDate, SC.DATE_FORMAT, SC.DEFAULT_TIMEZONE).hour(0).minute(0).second(0).millisecond(0)

    //Check that new planning date is a valid date or not is it before now
    if (momentTZ.tz(taskPlanningInput.rePlanningDate, SC.DATE_FORMAT, SC.DEFAULT_TIMEZONE).isBefore(nowMomentInUtc)) {
        throw new AppError('Can not merge before now', EC.INVALID_OPERATION, EC.HTTP_BAD_REQUEST)
    }

    let releasePlan = await MDL.ReleasePlanModel.findById(mongoose.Types.ObjectId(taskPlanningInput.releasePlan._id))
    if (!releasePlan) {
        throw new AppError('ReleasePlan not found', EC.NOT_FOUND, EC.HTTP_BAD_REQUEST)
    }

    let taskPlanning = await TaskPlanningModel.findById(mongoose.Types.ObjectId(taskPlanningInput._id))
    if (!taskPlanning) {
        throw new AppError('Invalid task plan', EC.INVALID_OPERATION, EC.HTTP_BAD_REQUEST)
    }

    //Check that previous planning date is a valid date and can be editable means is it before now
    if (momentTZ.tz(taskPlanning.planningDateString, SC.DATE_FORMAT, SC.DEFAULT_TIMEZONE).isBefore(nowMomentInUtc)) {
        throw new AppError('Can not merge task plan whose planned date is before now', EC.INVALID_OPERATION, EC.HTTP_BAD_REQUEST)
    }

    let release = await MDL.ReleaseModel.findById(mongoose.Types.ObjectId(releasePlan.release._id))
    if (!release) {
        throw new AppError('ReleasePlan is not having release id not found', EC.NOT_FOUND, EC.HTTP_BAD_REQUEST)
    }

    //check user highest role in this release
    let userRoleInThisRelease = await MDL.ReleaseModel.getUserHighestRoleInThisRelease(release._id, user)
    if (!userRoleInThisRelease) {
        throw new AppError('User is not having any role in this release so don`t have any access', EC.ACCESS_DENIED, EC.HTTP_FORBIDDEN)
    }
    if (!_.includes([SC.ROLE_LEADER, SC.ROLE_MANAGER], userRoleInThisRelease)) {
        throw new AppError('Only user with role [' + SC.ROLE_MANAGER + ' or ' + SC.ROLE_LEADER + '] can merge', EC.ACCESS_DENIED, EC.HTTP_FORBIDDEN)
    }
    // Conversion of planned hours in number format
    let numberPlannedHours = Number(taskPlanning.planning.plannedHours)

    // Add or update employee days details when task is planned
    // Check already added employees day detail or not
    if (await MDL.EmployeeDaysModel.count({
            'employee._id': taskPlanning.employee._id.toString(),
            'date': rePlanningDateMoment.toDate()
        }) > 0) {

        //  already added employees day detail so update employee days details with increment of planned hours and decrease planned hours from previous date
        let oldEmployeeDaysModelInput = {
            plannedHours: numberPlannedHours,
            employee: {
                _id: taskPlanning.employee._id.toString(),
                name: taskPlanning.employee.name
            },
            dateString: taskPlanning.planningDateString,
        }
        await MDL.EmployeeDaysModel.decreasePlannedHoursOnEmployeeDaysDetails(oldEmployeeDaysModelInput, user)
        let newEmployeeDaysModelInput = {
            plannedHours: numberPlannedHours,
            employee: {
                _id: taskPlanning.employee._id.toString(),
                name: taskPlanning.employee.name
            },
            dateString: taskPlanningInput.rePlanningDate,
        }
        await MDL.EmployeeDaysModel.increasePlannedHoursOnEmployeeDaysDetails(newEmployeeDaysModelInput, user)
    } else {

        // not added employees day detail so add employee days details with planned hour and decrease planned hours from previous date
        let oldEmployeeDaysModelInput = {
            plannedHours: numberPlannedHours,
            employee: {
                _id: taskPlanning.employee._id.toString(),
                name: taskPlanning.employee.name
            },
            dateString: taskPlanning.planningDateString
        }
        await MDL.EmployeeDaysModel.decreasePlannedHoursOnEmployeeDaysDetails(oldEmployeeDaysModelInput, user)

        let newEmployeeDaysModelInput = {
            employee: {
                _id: taskPlanning.employee._id.toString(),
                name: taskPlanning.employee.name
            },
            plannedHours: numberPlannedHours,
            dateString: taskPlanningInput.rePlanningDate,
        }
        await MDL.EmployeeDaysModel.addEmployeeDaysDetails(newEmployeeDaysModelInput, user)
    }

    // updating task plan with new planning date
    taskPlanning.created = Date.now()
    taskPlanning.planningDate = rePlanningDateMoment
    taskPlanning.planningDateString = taskPlanningInput.rePlanningDate
    await taskPlanning.save()

    taskPlanning = taskPlanning.toObject()
    taskPlanning.canMerge = true
    return taskPlanning
}


//Delete task planning 
taskPlanningSchema.statics.deleteTaskPlanning = async (taskPlanID, user) => {


    let taskPlanning = await TaskPlanningModel.findById(mongoose.Types.ObjectId(taskPlanID))
    if (!taskPlanning) {
        throw new AppError('Invalid task plan', EC.INVALID_OPERATION, EC.HTTP_BAD_REQUEST)
    }

    let release = await MDL.ReleaseModel.findById(taskPlanning.release._id)
    if (!release) {
        throw new AppError('Release not found', EC.NOT_FOUND, EC.HTTP_BAD_REQUEST)
    }

    let releasePlan = await MDL.ReleasePlanModel.findById(taskPlanning.releasePlan._id)
    if (!releasePlan) {
        throw new AppError('ReleasePlan not found', EC.NOT_FOUND, EC.HTTP_BAD_REQUEST)
    }

    //check user highest role in this release
    let userRoleInThisRelease = await MDL.ReleaseModel.getUserHighestRoleInThisRelease(release._id, user)
    if (!userRoleInThisRelease) {
        throw new AppError('User is not having any role in this release so don`t have any access', EC.ACCESS_DENIED, EC.HTTP_FORBIDDEN)
    }
    if (!_.includes([SC.ROLE_LEADER, SC.ROLE_MANAGER], userRoleInThisRelease)) {
        throw new AppError('Only user with role [' + SC.ROLE_MANAGER + ' or ' + SC.ROLE_LEADER + '] can delete plan task', EC.ACCESS_DENIED, EC.HTTP_FORBIDDEN)
    }

    let employee = await MDL.UserModel.findById(mongoose.Types.ObjectId(taskPlanning.employee._id)).exec()
    if (!employee) {
        throw new AppError('Developer Not Found', EC.NOT_FOUND, EC.HTTP_BAD_REQUEST)
    }

    let numberPlannedHours = Number(taskPlanning.planning.plannedHours)

    // As task plan is removed we have to decrease employee statistics  planned hours
    let EmployeeStatisticsModelInput = {
        release: {
            _id: release._id.toString(),
        },
        employee: {
            _id: employee._id.toString(),
        },
        task: {
            _id: releasePlan._id.toString(),
            plannedHours: numberPlannedHours,
            reportedHours: Number(0),
            plannedHoursReportedTasks: Number(0)
        }
    }
    await MDL.EmployeeStatisticsModel.decreseTaskDetailsHoursToEmployeeStatistics(EmployeeStatisticsModelInput, user)

    // As task plan is removed we have to decrease employee days  planned hours
    let oldEmployeeDaysModelInput = {
        plannedHours: numberPlannedHours,
        employee: {
            _id: employee._id.toString(),
            name: taskPlanning.employee.name
        },
        dateString: taskPlanning.planningDateString,
    }
    await MDL.EmployeeDaysModel.decreasePlannedHoursOnEmployeeDaysDetails(oldEmployeeDaysModelInput, user)

    // As task plan is removed we have to decrease release plan planned hours
    await MDL.ReleasePlanModel.update(
        {'_id': mongoose.Types.ObjectId(releasePlan._id)},
        {
            $inc: {
                'planning.plannedHours': -numberPlannedHours
            },
            flags: SC.FLAG_PLANNED
        })

    // As task plan is removed we have to decrease release planned hours
    await MDL.ReleaseModel.update(
        {'_id': mongoose.Types.ObjectId(release._id)},
        {
            $inc: {
                'initial.plannedHours': -numberPlannedHours
            }
        })

    //removed task planning
    return await TaskPlanningModel.remove({'_id': mongoose.Types.ObjectId(taskPlanning._id)})

}


//get all task plannins of a release plan 
taskPlanningSchema.statics.getReleaseTaskPlanningDetails = async (releasePlanID, user) => {
    let releasePlan = await MDL.ReleasePlanModel.findById(mongoose.Types.ObjectId(releasePlanID))

    if (!releasePlan) {
        throw new AppError('ReleasePlan not found', EC.NOT_FOUND, EC.HTTP_BAD_REQUEST)
    }

    if (!releasePlan || !releasePlan.release || !releasePlan.release._id) {
        throw new AppError('Release not found in release plan', EC.NOT_FOUND, EC.HTTP_BAD_REQUEST)
    }

    let release = await MDL.ReleaseModel.findById(mongoose.Types.ObjectId(releasePlan.release._id))

    if (!release) {
        throw new AppError('Release not found', EC.NOT_FOUND, EC.HTTP_BAD_REQUEST)
    }

    //check user highest role in this release
    let userRoleInThisRelease = await MDL.ReleaseModel.getUserHighestRoleInThisRelease(release._id, user)
    if (!userRoleInThisRelease) {
        throw new AppError('User is not having any role in this release so don`t have any access', EC.ACCESS_DENIED, EC.HTTP_FORBIDDEN)
    }
    if (!_.includes([SC.ROLE_MANAGER, SC.ROLE_LEADER], userRoleInThisRelease)) {
        throw new AppError('Only user with role [' + SC.ROLE_MANAGER + ' or ' + SC.ROLE_LEADER + '] can fetch', EC.ACCESS_DENIED, EC.HTTP_FORBIDDEN)
    }

    // fetch all task planning from release
    return await TaskPlanningModel.find({'releasePlan._id': mongoose.Types.ObjectId(releasePlan._id)}).sort({'planningDate': 1})
}


// get all task plannings according to developers and date range
taskPlanningSchema.statics.getTaskPlanningDetailsByEmpIdAndFromDateToDate = async (employeeId, fromDate, toDate, user) => {
    if (!employeeId)
        throw new AppError('Employee not found', EC.NOT_FOUND, EC.HTTP_BAD_REQUEST)

    let fromDateMomentTz
    let toDateMomentTz

    if (fromDate && fromDate != 'undefined' && fromDate != undefined) {
        let fromDateMoment = moment(fromDate)
        let fromDateMomentToDate = fromDateMoment.toDate()
        fromDateMomentTz = momentTZ.tz(fromDateMomentToDate, SC.DATE_FORMAT, SC.DEFAULT_TIMEZONE).hour(0).minute(0).second(0).millisecond(0)
    }

    if (toDate && toDate != 'undefined' && toDate != undefined) {
        let toDateMoment = moment(toDate)
        let toDateMomentToDate = toDateMoment.toDate()
        toDateMomentTz = momentTZ.tz(toDateMomentToDate, SC.DATE_FORMAT, SC.DEFAULT_TIMEZONE).hour(0).minute(0).second(0).millisecond(0)
    }

    // list of release Id`s where user is either manager or leader
    let releaseListOfID = []
    releaseListOfID = await MDL.ReleaseModel.find({
        $or: [{'manager._id': mongoose.Types.ObjectId(user._id)},
            {'leader._id': mongoose.Types.ObjectId(user._id)}]
    }, {'_id': 1})

    // All task plannings of selected employee Id
    let taskPlannings = await TaskPlanningModel.find({'employee._id': mongoose.Types.ObjectId(employeeId)}).sort({'planningDate': 1})

    // Conditions applied for filter according to required data and fromDate to toDate
    if (fromDate && fromDate != 'undefined' && fromDate != undefined && toDate && toDate != 'undefined' && toDate != undefined) {
        taskPlannings = taskPlannings.filter(tp => momentTZ.tz(tp.planningDateString, SC.DATE_FORMAT, SC.DEFAULT_TIMEZONE).hour(0).minute(0).second(0).millisecond(0).isSameOrAfter(fromDateMomentTz) && momentTZ.tz(tp.planningDateString, SC.DATE_FORMAT, SC.DEFAULT_TIMEZONE).hour(0).minute(0).second(0).millisecond(0).isSameOrBefore(toDateMomentTz))
    }
    else if (fromDate && fromDate != 'undefined' && fromDate != undefined) {
        taskPlannings = taskPlannings.filter(tp => momentTZ.tz(tp.planningDateString, SC.DATE_FORMAT, SC.DEFAULT_TIMEZONE).hour(0).minute(0).second(0).millisecond(0).isSameOrAfter(fromDateMomentTz))
    }
    else if (toDate && toDate != 'undefined' && toDate != undefined) {
        taskPlannings = taskPlannings.filter(tp => momentTZ.tz(tp.planningDateString, SC.DATE_FORMAT, SC.DEFAULT_TIMEZONE).hour(0).minute(0).second(0).millisecond(0).isSameOrBefore(toDateMomentTz))
    }


    let now = new Date()
    let nowString = moment(now).format(SC.DATE_FORMAT)
    let nowMomentInUtc = momentTZ.tz(nowString, SC.DATE_FORMAT, SC.DEFAULT_TIMEZONE).hour(0).minute(0).second(0).millisecond(0)

    //Return of filtered task plannings and checking it can be merged or not
    return taskPlannings.map(tp => {
        tp = tp.toObject()
        let check = momentTZ.tz(tp.planningDateString, SC.DATE_FORMAT, SC.DEFAULT_TIMEZONE).isBefore(nowMomentInUtc) || !(releaseListOfID && releaseListOfID.findIndex(release => release._id.toString() === tp.release._id.toString()) != -1)
        if (check) {
            tp.canMerge = false
        } else {
            tp.canMerge = true
        }
        return tp
    })
}


// add comments from task detail page by developer or manager or leader
taskPlanningSchema.statics.addComment = async (commentInput, user, schemaRequested) => {
    if (schemaRequested)
        return V.generateSchema(V.releaseTaskPlanningCommentStruct)

    V.validate(commentInput, V.releaseTaskPlanningCommentStruct)

    let release = await MDL.ReleaseModel.findById(mongoose.Types.ObjectId(commentInput.releaseID))
    if (!release) {
        throw new AppError('Release not found', EC.NOT_FOUND, EC.HTTP_BAD_REQUEST)
    }

    //check user highest role in this release
    let userRoleInThisRelease = await MDL.ReleaseModel.getUserHighestRoleInThisRelease(release._id, user)
    if (!userRoleInThisRelease) {
        throw new AppError('User is not having any role in this release so don`t have any access', EC.ACCESS_DENIED, EC.HTTP_FORBIDDEN)
    }
    if (!_.includes([SC.ROLE_LEADER, SC.ROLE_DEVELOPER, SC.ROLE_NON_PROJECT_DEVELOPER, SC.ROLE_MANAGER], userRoleInThisRelease)) {
        throw new AppError('Only user with role [' + SC.ROLE_MANAGER + ' or ' + SC.ROLE_DEVELOPER + ' or ' + SC.ROLE_NON_PROJECT_DEVELOPER, +' or ' + SC.ROLE_LEADER + '] can comment', EC.ACCESS_DENIED, EC.HTTP_FORBIDDEN)
    }

    let releasePlan = await MDL.ReleasePlanModel.findById(mongoose.Types.ObjectId(commentInput.releasePlanID))
    if (!releasePlan) {
        throw new AppError('releasePlan not found', EC.NOT_FOUND, EC.HTTP_BAD_REQUEST)
    }

    let now = new Date()
    let comment = {}
    comment.name = user.firstName + ' ' + user.lastName
    comment.comment = commentInput.comment
    comment.commentType = commentInput.commentType
    comment.date = now
    comment.dateString = moment(now).format(SC.DEFAULT_DATE_FORMAT)
    await MDL.ReleasePlanModel.update({
        '_id': mongoose.Types.ObjectId(releasePlan._id)
    }, {$push: {'comments': comment}}).exec()

    return {releasePlanID: releasePlan._id}
}


// calendar
// get all task plans of a loggedIn user
taskPlanningSchema.statics.getAllTaskPlanningsForCalenderOfUser = async (user) => {
    // fetch all task planning from release
    let taskPlans = await MDL.TaskPlanningModel.find({
        'employee._id': mongoose.Types.ObjectId(user._id)
    }, {
        task: 1,
        planningDateString: 1,
        planning: 1,
        report: 1,
        _id: 1,
    })
    return taskPlans
}


taskPlanningSchema.statics.getTaskAndProjectDetailForCalenderOfUser = async (taskPlanID, user) => {

    let taskPlan = await MDL.TaskPlanningModel.findById(mongoose.Types.ObjectId(taskPlanID))

    if (!taskPlan) {
        throw new AppError('taskPlan not found', EC.NOT_FOUND, EC.HTTP_BAD_REQUEST)
    }
    if (!taskPlan.release || !taskPlan.release._id || !taskPlan.releasePlan || !taskPlan.releasePlan._id) {
        throw new AppError('Not a valid task plan', EC.INVALID_OPERATION, EC.HTTP_BAD_REQUEST)
    }

    let releasePlan = await MDL.ReleasePlanModel.findById(mongoose.Types.ObjectId(taskPlan.releasePlan._id))

    if (!releasePlan) {
        throw new AppError('releasePlan not found', EC.INVALID_OPERATION, EC.HTTP_BAD_REQUEST)
    }


    let release = await MDL.ReleaseModel.findById(mongoose.Types.ObjectId(taskPlan.release._id))
    if (!release) {
        throw new AppError('release not found', EC.INVALID_OPERATION, EC.HTTP_BAD_REQUEST)
    }

    release = release.toObject()
    release.taskPlan = taskPlan
    release.releasePlan = releasePlan
    return release
}


// Shifting task plans to future
taskPlanningSchema.statics.planningShiftToFuture = async (planning, user, schemaRequested) => {
    if (schemaRequested)
        return V.generateSchema(V.releaseTaskPlanningStruct)

    V.validate(planning, V.releaseTaskPlanningShiftStruct)
    let startShiftDateString
    let endShiftDateString

    // Days to shift conversion in number
    let daysToShiftNumber = Number(planning.daysToShift)

    // employeeId must be present or its value must be all
    let employee = {}
    if (planning.employeeId && planning.employeeId.toLowerCase() != 'all') {
        employee = await MDL.UserModel.findById(mongoose.Types.ObjectId(planning.employeeId))
        if (!employee)
            throw new AppError('Not a valid user', EC.ACCESS_DENIED, EC.HTTP_BAD_REQUEST)

    } else employee._id = 'all'


    // Conversion of date into utc
    let now = new Date()
    // Now in UTC
    let nowString = moment(now).format(SC.DATE_FORMAT)
    let nowMomentInUtc = momentTZ.tz(nowString, SC.DATE_FORMAT, SC.DEFAULT_TIMEZONE).hour(0).minute(0).second(0).millisecond(0)
    // Base Date in UTC
    let baseDateMomentInUtc = momentTZ.tz(planning.baseDate, SC.DATE_FORMAT, SC.DEFAULT_TIMEZONE).hour(0).minute(0).second(0).millisecond(0)

    // can not shift task whose planning date is before now
    if (baseDateMomentInUtc.isBefore(nowMomentInUtc)) {
        throw new AppError('Can not shift previous tasks', EC.ACCESS_DENIED, EC.HTTP_BAD_REQUEST)
    }


    // ReleasePlan is valid or not
    let releasePlan = await MDL.ReleasePlanModel.findById(mongoose.Types.ObjectId(planning.releasePlanID))
    if (!releasePlan)
        throw new AppError('Not a valid release plan', EC.ACCESS_DENIED, EC.HTTP_BAD_REQUEST)


    // Release is valid or not
    let release = await MDL.ReleaseModel.findById(mongoose.Types.ObjectId(releasePlan.release._id))
    if (!release)
        throw new AppError('Not a valid release', EC.ACCESS_DENIED, EC.HTTP_BAD_REQUEST)

    // check user role in this release
    let userRoleInThisRelease = await MDL.ReleaseModel.getUserHighestRoleInThisRelease(release._id, user)
    if (!userRoleInThisRelease) {
        throw new AppError('User is not having any role in this release so don`t have any access', EC.ACCESS_DENIED, EC.HTTP_FORBIDDEN)
    }
    if (!_.includes([SC.ROLE_LEADER, SC.ROLE_MANAGER], userRoleInThisRelease)) {
        throw new AppError('Only user with role [' + SC.ROLE_MANAGER + ' or ' + SC.ROLE_LEADER + '] can shift', EC.ACCESS_DENIED, EC.HTTP_FORBIDDEN)
    }

    // fetch all task plannings according to applied conditions
    let taskPlannings
    if (planning.employeeId && planning.employeeId.toLowerCase() == 'all') {

        // Get all employee`s task plannings
        taskPlannings = await TaskPlanningModel.distinct(
            'planningDate',
            {
                'releasePlan._id': mongoose.Types.ObjectId(releasePlan._id),
                'planningDate': {$gte: baseDateMomentInUtc}
            })
    } else {

        // Get selected employee`s task plannings
        taskPlannings = await TaskPlanningModel.distinct(
            'planningDate',
            {
                'employee._id': mongoose.Types.ObjectId(employee._id),
                'releasePlan._id': mongoose.Types.ObjectId(releasePlan._id),
                'planningDate': {$gte: baseDateMomentInUtc}
            })
    }

    //Sorting task plannings according to date
    if (taskPlannings && taskPlannings.length) {
        taskPlannings.sort(function (a, b) {
            a = new Date(a)
            b = new Date(b)
            return a < b ? -1 : a > b ? 1 : 0
        })

        //Form base date to end date of task plannings and added some extra days multiple of 10 so that when holiday will be getting then also operation can be performed
        let toTz = momentTZ.tz(taskPlannings[taskPlannings.length - 1], SC.DATE_FORMAT, SC.DEFAULT_TIMEZONE).add(10 * daysToShiftNumber, 'days').hour(0).minute(0).second(0).millisecond(0)

        //Getting data of all days, working days, and work on holidays
        let daysDetails = await getWorkingDaysAndHolidays(baseDateMomentInUtc.format(SC.DATE_FORMAT), toTz.format(SC.DATE_FORMAT), taskPlannings, user)

        //counter to count task occure in holidays
        let taskOnHolidayCount = 0

        startShiftDateString = daysDetails.taskPlannings && daysDetails.taskPlannings.length ? momentTZ.tz(daysDetails.taskPlannings[0], SC.DATE_FORMAT, SC.DEFAULT_TIMEZONE).hour(0).minute(0).second(0).millisecond(0).format(SC.DATE_FORMAT) : nowMomentInUtc.format(SC.DATE_FORMAT)

        // Shifting starts with loop
        let ShiftingPromises = daysDetails.taskPlannings && daysDetails.taskPlannings.length ? daysDetails.taskPlannings.map(async (PlanningDate, idx) => {
            //
            let PlanningDateMoment = momentTZ.tz(PlanningDate, SC.DATE_FORMAT, SC.DEFAULT_TIMEZONE).hour(0).minute(0).second(0).millisecond(0)
            // calculating index of working day list where planning date and working date is same
            let index = daysDetails.AllWorkingDayList && daysDetails.AllWorkingDayList.length ? daysDetails.AllWorkingDayList.findIndex(wd => wd.isSame(moment(PlanningDate))) : -1
            if (index != -1) {
                //if true then  plannig must have done in working days
                let newShiftingDate = daysDetails.AllWorkingDayList[Number(Number(index) + Number(taskOnHolidayCount) + daysToShiftNumber)]
                let newShiftingDateString = moment(newShiftingDate).format(SC.DATE_FORMAT)
                let newShiftingDateMomentTz = momentTZ.tz(newShiftingDateString, SC.DATE_FORMAT, SC.DEFAULT_TIMEZONE).clone()
                // updating Task planning to proper date

                // Calculating last transfer date
                if (idx === (Number(daysDetails.taskPlannings.length - 1))) {
                    endShiftDateString = newShiftingDateString
                }
                if (employee._id == 'all') {
                    // task planning of all employee will shift

                    return await TaskPlanningModel.update({
                            'releasePlan._id': mongoose.Types.ObjectId(releasePlan._id),
                            'planningDate': PlanningDateMoment.clone().toDate(),
                            'isShifted': false
                        },
                        {
                            $set: {
                                'planningDate': newShiftingDateMomentTz.clone().toDate(),
                                'planningDateString': newShiftingDateString,
                                'isShifted': true
                            }
                        }, {multi: true}).exec()
                } else {
                    // task planning of selected employee will shift

                    return await TaskPlanningModel.update({
                            'releasePlan._id': mongoose.Types.ObjectId(releasePlan._id),
                            'planningDate': PlanningDateMoment.clone().toDate(),
                            'employee._id': mongoose.Types.ObjectId(employee._id),
                            'isShifted': false
                        },
                        {
                            $set: {
                                'planningDate': newShiftingDateMomentTz.clone().toDate(),
                                'planningDateString': newShiftingDateString,
                                'isShifted': true
                            }
                        }, {multi: true}).exec()
                }

            } else if (daysDetails.AllTasksOnHolidayList && daysDetails.AllTasksOnHolidayList.length && daysDetails.AllTasksOnHolidayList.findIndex(wd => wd.date.isSame(moment(PlanningDate))) != -1) {
                //else  planning must have done in holidays
                // calculating index of holiday where planning date and holiday  date are same
                index = daysDetails.AllTasksOnHolidayList.findIndex(wd => wd.date.isSame(PlanningDateMoment))


                //new Shifting date where task has to be placed
                let newShiftingDate = daysDetails.AllWorkingDayList[Number(Number(taskOnHolidayCount) + Number(daysDetails.AllTasksOnHolidayList[index].index) + daysToShiftNumber)]
                let newShiftingDateString = moment(newShiftingDate).format(SC.DATE_FORMAT)
                let newShiftingDateMomentTz = momentTZ.tz(newShiftingDateString, SC.DATE_FORMAT, SC.DEFAULT_TIMEZONE).clone()
                // console.log("PlanningDate", PlanningDateMoment, "->", "newShiftingDate", newShiftingDate, "holiday \n")

                // Calculating last transfer date
                if (idx === (Number(daysDetails.taskPlannings.length - 1))) {
                    endShiftDateString = newShiftingDateString
                }
                taskOnHolidayCount++
                // updating Task planning to proper date
                if (planning.employeeId == 'all') {
                    // task planning of all employee will shift
                    return await TaskPlanningModel.update({
                            'releasePlan._id': planning.releasePlanID,
                            'planningDate': PlanningDateMoment.clone().toDate(),
                            'isShifted': false
                        },
                        {
                            $set: {
                                'planningDate': newShiftingDateMomentTz.clone().toDate(),
                                'planningDateString': newShiftingDateString,
                                'isShifted': true
                            }
                        }, {multi: true}
                    ).exec()
                } else {
                    // task planning of selected employee will shift
                    return await TaskPlanningModel.update({
                            'releasePlan._id': planning.releasePlanID,
                            'planningDate': PlanningDateMoment.clone().toDate(),
                            'employee._id': mongoose.Types.ObjectId(employee._id),
                            'isShifted': false
                        },
                        {
                            $set: {
                                'planningDate': newShiftingDateMomentTz.clone().toDate(),
                                'planningDateString': newShiftingDateString,
                                'isShifted': true
                            }
                        }, {multi: true}
                    ).exec()
                }
            } else {
                //System inconsistency
                throw new AppError('System inconsistency planning is neither on working days nor holidays ', EC.NOT_FOUND, EC.HTTP_BAD_REQUEST)
            }
        }) : new Promise((resolve, reject) => {
            return resolve(false)
        })
        await Promise.all(ShiftingPromises).then(async promise => {
            return await TaskPlanningModel.update({'releasePlan._id': planning.releasePlanID}, {$set: {'isShifted': false}}, {multi: true}).exec()
        })

        await updateEmployeeDays(startShiftDateString, endShiftDateString ? endShiftDateString : nowMomentInUtc, user)
    } else {
        throw new AppError('No task available to shift', EC.NOT_FOUND, EC.HTTP_BAD_REQUEST)
    }
    return planning
}


// Shifting task plans to past
taskPlanningSchema.statics.planningShiftToPast = async (planning, user, schemaRequested) => {
    if (schemaRequested)
        return V.generateSchema(V.releaseTaskPlanningStruct)
    V.validate(planning, V.releaseTaskPlanningShiftStruct)
// Days to shift conversion in number
    let daysToShiftNumber = Number(planning.daysToShift)
// employeeId must be present or its value must be all
    let employee = {}
    if (planning.employeeId && planning.employeeId.toLowerCase() != 'all') {
        employee = await MDL.UserModel.findById(mongoose.Types.ObjectId(planning.employeeId))

        if (!employee)
            throw new AppError('Not a valid user', EC.ACCESS_DENIED, EC.HTTP_BAD_REQUEST)

    } else employee._id = 'all'


// can not shift task whose planning date is before now
    let now = new Date()
    // Now in UTC
    let nowString = moment(now).format(SC.DATE_FORMAT)
    let nowMomentInUtc = momentTZ.tz(nowString, SC.DATE_FORMAT, SC.DEFAULT_TIMEZONE).hour(0).minute(0).second(0).millisecond(0)
    // Base Date in UTC
    let baseDateMomentInUtc = momentTZ.tz(planning.baseDate, SC.DATE_FORMAT, SC.DEFAULT_TIMEZONE).hour(0).minute(0).second(0).millisecond(0)
    if (baseDateMomentInUtc.isBefore(nowMomentInUtc)) {
        throw new AppError('Can not shift previous tasks', EC.ACCESS_DENIED, EC.HTTP_BAD_REQUEST)
    }


// ReleasePlan is valid or not
    let releasePlan = await MDL.ReleasePlanModel.findById(mongoose.Types.ObjectId(planning.releasePlanID))
    if (!releasePlan)
        throw new AppError('Not a valid release plan', EC.ACCESS_DENIED, EC.HTTP_BAD_REQUEST)


// Release is valid or not
    let release = await MDL.ReleaseModel.findById(mongoose.Types.ObjectId(releasePlan.release._id))
    if (!release)
        throw new AppError('Not a valid release', EC.ACCESS_DENIED, EC.HTTP_BAD_REQUEST)

    // check user role in this release
    let userRoleInThisRelease = await MDL.ReleaseModel.getUserHighestRoleInThisRelease(release._id, user)
    if (!userRoleInThisRelease) {
        throw new AppError('User is not having any role in this release so don`t have any access', EC.ACCESS_DENIED, EC.HTTP_FORBIDDEN)
    }
    if (!_.includes([SC.ROLE_LEADER, SC.ROLE_MANAGER], userRoleInThisRelease)) {
        throw new AppError('Only user with role [' + SC.ROLE_MANAGER + ' or ' + SC.ROLE_LEADER + '] can shift', EC.ACCESS_DENIED, EC.HTTP_FORBIDDEN)
    }

// fetch all task plannings according to applied conditions
    let taskPlannings
    if (planning.employeeId && planning.employeeId.toLowerCase() == 'all') {
        // Get all employee`s task plannings

        taskPlannings = await TaskPlanningModel.distinct(
            'planningDate',
            {
                'releasePlan._id': mongoose.Types.ObjectId(releasePlan._id),
                'planningDate': {$gte: baseDateMomentInUtc}
            })
    } else {
        // Get selected employee`s task plannings

        taskPlannings = await TaskPlanningModel.distinct(
            'planningDate',
            {
                'employee._id': mongoose.Types.ObjectId(employee._id),
                'releasePlan._id': mongoose.Types.ObjectId(releasePlan._id),
                'planningDate': {$gte: baseDateMomentInUtc}
            })
    }
    // console.log("taskPlannings", taskPlannings)

    if (taskPlannings && taskPlannings.length) {

        taskPlannings.sort(function (a, b) {
            //  console.log("before a", a, "b", b)
            a = new Date(a)
            b = new Date(b)
            // console.log("after a", a, "b", b)
            return a < b ? -1 : a > b ? 1 : 0
        })

        let startShiftingDateMoment = momentTZ.tz(taskPlannings[0], SC.DATE_FORMAT, SC.DEFAULT_TIMEZONE).hour(0).minute(0).second(0).millisecond(0)
        let startShiftingDate = startShiftingDateMoment.subtract(daysToShiftNumber, 'days')
        // Can not shift task plannings before now
        if (startShiftingDate.isBefore(nowMomentInUtc)) {
            throw new AppError('Can not shift before now ', EC.NOT_FOUND, EC.HTTP_BAD_REQUEST)
        } else {
            let previousDaysDetails = await getWorkingDaysAndHolidays(moment(taskPlannings[taskPlannings.length - 1]).subtract(10 * daysToShiftNumber, 'days'), momentTZ.tz(taskPlannings[0], SC.DATE_FORMAT, SC.DEFAULT_TIMEZONE).hour(0).minute(0).second(0).millisecond(0))
            //console.log("previousDaysDetails", previousDaysDetails)
            let idx = previousDaysDetails.AllWorkingDayList.findIndex(wd => wd.isSame(baseDateMomentInUtc))
            let idx2 = previousDaysDetails.AllTasksOnHolidayList.findIndex(wd => wd.isSame(baseDateMomentInUtc))
            if (idx != -1 && idx > daysToShiftNumber && previousDaysDetails.AllWorkingDayList[Number(idx - daysToShiftNumber)].isBefore(nowMomentInUtc)) {

                throw new AppError('Can not shift because less working days available for task shifting ', EC.NOT_FOUND, EC.HTTP_BAD_REQUEST)
            } else if (idx2 != -1 && previousDaysDetails.AllWorkingDayList[Number(Number(previousDaysDetails.AllTasksOnHolidayList[idx2].index) - daysToShiftNumber)].isBefore(nowMomentInUtc)) {
                throw new AppError('Can not shift because less working days available for task shifting and In holiday also tasks are planned', EC.NOT_FOUND, EC.HTTP_BAD_REQUEST)
            } else {

                if (idx != -1) {
                    startShiftingDate = previousDaysDetails.AllWorkingDayList[Number(idx - daysToShiftNumber)]
                } else if (idx2 != -1) {
                    startShiftingDate = previousDaysDetails.AllWorkingDayList[Number(Number(previousDaysDetails.AllTasksOnHolidayList[idx2].index) - daysToShiftNumber)]
                }
            }
        }
        // console.log("startShiftingDate", startShiftingDate)
        let to = moment(taskPlannings[taskPlannings.length - 1]).add(10 * planning.daysToShift, 'days')

        let daysDetails = await getWorkingDaysAndHolidays(startShiftingDate.toDate(), to.toDate(), taskPlannings, user)
        //  console.log("daysDetails", daysDetails)
        let taskOnHolidayCount = 0

        let ShiftingPromises = daysDetails.taskPlannings && daysDetails.taskPlannings.length ? daysDetails.taskPlannings.map(async PlanningDate => {
            // calculating index of working day list where planning date and working date is same
            let PlanningDateMoment = momentTZ.tz(PlanningDate, SC.DATE_FORMAT, SC.DEFAULT_TIMEZONE).hour(0).minute(0).second(0).millisecond(0)

            let index = daysDetails.AllWorkingDayList && daysDetails.AllWorkingDayList.length ? daysDetails.AllWorkingDayList.findIndex(wd => wd.isSame(moment(PlanningDate))) : -1
            if (index != -1) {
                //if true then  planing must have done in working days
                let newShiftingDate = daysDetails.AllWorkingDayList[Number(Number(index) + Number(taskOnHolidayCount) - daysToShiftNumber)]
                let newShiftingDateString = moment(newShiftingDate).format(SC.DATE_FORMAT)
                let newShiftingDateMomentTz = momentTZ.tz(newShiftingDateString, SC.DATE_FORMAT, SC.DEFAULT_TIMEZONE).clone()
                // updating Task planning to proper date
                if (planning.employeeId == 'all') {
                    // task planning of all employee will shift

                    return await TaskPlanningModel.update({
                            'releasePlan._id': mongoose.Types.ObjectId(releasePlan._id),
                            'planningDate': PlanningDateMoment.clone().toDate(),
                            'isShifted': false
                        },
                        {
                            $set: {
                                'planningDate': newShiftingDateMomentTz.clone().toDate(),
                                'planningDateString': newShiftingDateString,
                                'isShifted': true
                            }
                        }, {multi: true}).exec()
                } else {
                    // task planning of selected employee will shift

                    return await TaskPlanningModel.update({
                            'releasePlan._id': mongoose.Types.ObjectId(releasePlan._id),
                            'planningDate': PlanningDateMoment.clone().toDate(),
                            'employee._id': mongoose.Types.ObjectId(employee._id),
                            'isShifted': false
                        },
                        {
                            $set: {
                                'planningDate': newShiftingDateMomentTz.clone(),
                                'planningDateString': newShiftingDateString,
                                'isShifted': true
                            }
                        }, {multi: true}).exec()
                }
            } else if (daysDetails.AllTasksOnHolidayList && daysDetails.AllTasksOnHolidayList.length && daysDetails.AllTasksOnHolidayList.findIndex(wd => wd.date.isSame(moment(PlanningDate))) != -1) {
                //else  plannig must have done in holidays
                // calculating index of holiday where planning date and holiday  date are same
                index = daysDetails.AllTasksOnHolidayList.findIndex(wd => wd.date.isSame(PlanningDateMoment))

                //new Shifting date where task has to be placed
                let newShiftingDate = daysDetails.AllWorkingDayList[Number(Number(taskOnHolidayCount) + Number(daysDetails.AllTasksOnHolidayList[index].index) - daysToShiftNumber)]

                let newShiftingDateString = moment(newShiftingDate).format(SC.DATE_FORMAT)
                let newShiftingDateMomentTz = momentTZ.tz(newShiftingDateString, SC.DATE_FORMAT, SC.DEFAULT_TIMEZONE).clone()
                // console.log("PlanningDate", PlanningDateMoment, "->", "newShiftingDate", newShiftingDate, "holiday \n")
                taskOnHolidayCount++
                // updating Task planning to proper date
                if (planning.employeeId == 'all') {
                    // task planning of all employee will shift
                    return await TaskPlanningModel.update({
                            'releasePlan._id': planning.releasePlanID,
                            'planningDate': PlanningDateMoment.clone(),
                            'isShifted': false
                        },
                        {
                            $set: {
                                'planningDate': newShiftingDateMomentTz.clone(),
                                'planningDateString': newShiftingDateString,
                                'isShifted': true
                            }
                        }, {multi: true}
                    ).exec()
                } else {
                    // task planning of selected employee will shift
                    return await TaskPlanningModel.update({
                            'releasePlan._id': mongoose.Types.ObjectId(releasePlan._id),
                            'planningDate': PlanningDateMoment.clone(),
                            'employee._id': mongoose.Types.ObjectId(employee._id),
                            'isShifted': false
                        },
                        {
                            $set: {
                                'planningDate': newShiftingDateMomentTz.clone(),
                                'planningDateString': newShiftingDateString,
                                'isShifted': true
                            }
                        }, {multi: true}
                    ).exec()
                }


            } else {
                //System inconsistency
                throw new AppError('System inconsistency planning is neither on working days nor holidays ', EC.NOT_FOUND, EC.HTTP_BAD_REQUEST)
            }
        }) : new Promise((resolve, reject) => {
            return resolve(false)
        })

        await Promise.all(ShiftingPromises).then(async promise => {
            return await TaskPlanningModel.update({'releasePlan._id': mongoose.Types.ObjectId(releasePlan._id)}, {$set: {'isShifted': false}}, {multi: true}).exec()
        })
        await updateEmployeeDays(startShiftingDate.toDate(), to.toDate(), user)
    } else {
        throw new AppError('No task available to shift', EC.NOT_FOUND, EC.HTTP_BAD_REQUEST)
    }
    return planning
}

// to calculate working days and holidays
const getWorkingDaysAndHolidays = async (from, to, taskPlannings, user) => {
    // call to holiday model to get holiday lists
    let holidays = await MDL.YearlyHolidaysModel.getAllYearlyHolidaysBaseDateToEnd(from, to, user)
    let i = 0
    let holidayObjectList = []
    // inside holidays all holidays has been fetched to make array of only holidays condition and looping is applied
    if (holidays && holidays.length && holidays.length > 1) {
        // for more than a year
        holidayObjectList = holidays[0].holidays
        while (i < holidays.length - 1) {
            holidayObjectList.concat(holidays[i + 1])
            i++
        }
    } else if (holidays && holidays.length) {
        // for with in a single year
        holidayObjectList = holidays[0].holidays
    } else {
        //No holiday available to this list
    }

    // Converting holiday Object List to Date with UTC moment
    let holidayDateList = holidayObjectList && holidayObjectList.length ? _.map(holidayObjectList, function (obj) {
        return momentTZ.tz(obj.date, SC.DATE_FORMAT, SC.DEFAULT_TIMEZONE).hour(0).minute(0).second(0).millisecond(0)
    }) : []

    //Getting All Dates, AllWorkingDayList, AllTasksOnHolidayList, object ,Arrays and other Fields after calculation
    return await getDates(from, to, taskPlannings, holidayDateList)

}


// to calculate working days and Task on holidays
const getDates = async (from, to, taskPlannings, holidayList) => {
    let fromMoment = momentTZ.tz(from, SC.DATE_FORMAT, SC.DEFAULT_TIMEZONE).hour(0).minute(0).second(0).millisecond(0)
    let toMoment = momentTZ.tz(to, SC.DATE_FORMAT, SC.DEFAULT_TIMEZONE).hour(0).minute(0).second(0).millisecond(0)
    let AllDateList = []
    let AllWorkingDayList = []
    let AllTasksOnHolidayList = []

    while (fromMoment.isSameOrBefore(toMoment.clone())) {
        AllDateList.push(fromMoment.clone())
        //date which is not part of holidays
        if (holidayList && holidayList.length && holidayList.findIndex(obj => momentTZ.tz(obj, SC.DATE_FORMAT, SC.DEFAULT_TIMEZONE).hour(0).minute(0).second(0).millisecond(0).isSame(fromMoment.clone())) != -1) {
            //Date is available in holiday list so we have to check that on that day any task is planned or not
            if (taskPlannings && taskPlannings.length && taskPlannings.findIndex(obj => momentTZ.tz(obj, SC.DATE_FORMAT, SC.DEFAULT_TIMEZONE).hour(0).minute(0).second(0).millisecond(0).isSame(fromMoment.clone())) != -1) {
                // if true then on this date (fromMoment) any task is planned so push on AllTasksOnHolidayList
                AllTasksOnHolidayList.push({date: fromMoment, index: AllWorkingDayList.length})
            }

        } else {
            //Date is not holiday date so it is included in working day list
            AllWorkingDayList.push(fromMoment.clone())
        }
        // increment of date
        fromMoment = fromMoment.clone().add(1, 'days')
    }
    return {
        AllTasksOnHolidayList,
        AllWorkingDayList,
        AllDateList,
        from,
        to,
        taskPlannings,
        holidayList
    }
}


const updateEmployeeDays = async (startDateString, endDateString, user) => {
    let startDateToString = moment(startDateString).format(SC.DATE_FORMAT)
    let endDateToString = moment(endDateString).format(SC.DATE_FORMAT)
    let startDateMomentTz = momentTZ.tz(startDateToString, SC.DATE_FORMAT, SC.DEFAULT_TIMEZONE).hour(0).minute(0).second(0).millisecond(0)
    let endDateMomentTz = momentTZ.tz(endDateToString, SC.DATE_FORMAT, SC.DEFAULT_TIMEZONE).hour(0).minute(0).second(0).millisecond(0)

    /*
    * task planning model group by (employee && planningDate)*/

    let taskPlannings = await MDL.TaskPlanningModel.aggregate([{
        $match: {planningDate: {$gte: startDateMomentTz.toDate(), $lte: endDateMomentTz.toDate()}}
    }, {
        $project: {
            planningDate: 1,
            planningDateString: 1,
            employee: 1,
            planning: {
                plannedHours: 1
            }
        }
    }, {
        $group: {
            _id: {
                'planningDate': '$planningDate',
                'employeeID': '$employee._id'
            },
            planningDate: {$first: '$planningDate'},
            employee: {$first: '$employee'},
            plannedHours: {$sum: '$planning.plannedHours'},
            count: {$sum: 1}
        }
    }]).exec()

    // Employee task planning details will be deleted
    let deleteEmployeeDetails = await MDL.EmployeeDaysModel.remove({
        'date': {$gte: startDateMomentTz.clone().toDate(), $lte: startDateMomentTz.clone().toDate()}
    })
    // console.log("deleteEmployeeDetails", deleteEmployeeDetails)
    let saveEmployeePromises = taskPlannings && taskPlannings.length ? taskPlannings.map(async tp => {

        let employeeDaysInput = {
            employee: {
                _id: tp.employee._id.toString(),
                name: tp.employee.name
            },
            dateString: moment(tp.planningDate).format(SC.DATE_FORMAT),
            plannedHours: Number(tp.plannedHours)
        }
        //  console.log("employeeDaysInput--", employeeDaysInput)
        return await MDL.EmployeeDaysModel.addEmployeeDaysDetails(employeeDaysInput, user)
    }) : new Promise((resolve, reject) => {
        return resolve(false)
    })
    // console.log("saveEmployeePromises", saveEmployeePromises)
    return await Promise.all(saveEmployeePromises)

}
const TaskPlanningModel = mongoose.model('TaskPlanning', taskPlanningSchema)
export default TaskPlanningModel


/*
[{

    "dateString": "10/10/10",
    "task": {
        "_id": "5a900ab687ccf511f8d967e6",
        "name": "Registration with faceBook"
    },
    "release": {
        "_id": "5a93c0062af17a16e808b342"
    },
    "employee": {
        "_id": "5a8fc06a6f655c1e84360a2d",
        "name": "negotiator 1"
    },
    "flags": "un-reported",
    "planning": {
        "plannedHours": 20
    },
    "report": {
        "status": "un-reported",
        "reasons": "general-delay",
        "reportedHours": 2
    }
}]
*/
{/*

db.taskplannings.aggregate([{
    $match: {planningDate: {$gte: new Date("2018-05-19"), $lte: new Date("2018-05-30")}}
}, {
    $project: {
        release: 1,
        planningDate: 1,
        planningDateString: 1,
        employee: 1,
        planning: {
            plannedHours: 1
        }
    }
}, {
    $group: {
        _id: {
            "planningDate": "$planningDate",
            "employee": "$employee",
            "release": "$release"
        },
        planningDate: {$first: "$planningDate"},
        employee: {$first: "$employee"},
        release: {$first: "$release"},
        plannedHours: {$sum: "$planning.plannedHours"},
        count: {$sum: 1}
    }
}])

        */
}