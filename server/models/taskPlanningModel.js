import mongoose from 'mongoose'
import AppError from '../AppError'
import momentTZ from 'moment-timezone'
import moment from 'moment'
import logger from '../logger'
import * as SC from '../serverconstants'
import * as EC from '../errorcodes'
import * as MDL from '../models'
import * as V from '../validation'
import * as U from '../utils'
import * as EM from '../errormessages'
import _ from 'lodash'

mongoose.Promise = global.Promise

let taskPlanningSchema = mongoose.Schema({
    user: {
        _id: mongoose.Schema.ObjectId,
        name: {type: String},
        role: {type: String},
    },
    created: {type: Date, default: Date.now()},
    planningDate: {type: Date},
    planningDateString: String,
    isShifted: {type: Boolean, default: false},
    description: {type: String},
    iterationType: {type: String},
    task: {
        _id: mongoose.Schema.ObjectId,
        name: {type: String, required: [true, 'Task name is required']},
        description: {type: String},
    },
    release: {
        _id: mongoose.Schema.ObjectId
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
        enum: SC.ALL_WARNING_NAME_ARRAY
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
            enum: [SC.REASON_GENERAL_DELAY, SC.REASON_EMPLOYEE_ON_LEAVE, SC.REASON_INCOMPLETE_DEPENDENCY, SC.REASON_NO_GUIDANCE_PROVIDED, SC.REASON_RESEARCH_WORK, SC.REASON_UNFAMILIAR_TECHNOLOGY]
        }],
        reportedHours: {type: Number, default: 0},
        reportedOnDate: {type: Date},
        comment: {
            comment: String,
            commentType: String
        }
    }
}, {
    usePushEach: true
})

/*-----------------------------------------------------------------GET_TASK_PLANS_START---------------------------------------------------------------*/


taskPlanningSchema.statics.getAllTaskPlannings = async (releaseID, user) => {
    let release = await MDL.ReleaseModel.findById(releaseID)
    if (!release) {
        throw new AppError('Release not found', EC.NOT_FOUND, EC.HTTP_BAD_REQUEST)
    }
    // Get all roles user have in this release
    let userRolesInThisRelease = await MDL.ReleaseModel.getUserRolesInThisRelease(release._id, user)
    if (!U.includeAny([SC.ROLE_LEADER, SC.ROLE_MANAGER], userRolesInThisRelease)) {
        throw new AppError('Only user with role [' + SC.ROLE_MANAGER + ' or ' + SC.ROLE_LEADER + '] can see TaskPlan of any release', EC.ACCESS_DENIED, EC.HTTP_FORBIDDEN)
    }

    return await MDL.TaskPlanningModel.find({'release._id': releaseID})

}


/* get all task plannings according to developers and date range */
taskPlanningSchema.statics.getTaskPlanningDetailsByEmpIdAndFromDateToDate = async (employeeId, fromDate, toDate, user) => {
    if (!employeeId)
        throw new AppError('Employee not found', EC.NOT_FOUND, EC.HTTP_BAD_REQUEST)

    let fromDateMomentTz = U.momentInUTC(fromDate)
    let toDateMomentTz = U.momentInUTC(toDate)

    /* list of release Id`s where user is either manager or leader */
    let releaseListOfID = []
    releaseListOfID = await MDL.ReleaseModel.find({
        $or: [{'manager._id': mongoose.Types.ObjectId(user._id)},
            {'leader._id': mongoose.Types.ObjectId(user._id)}]
    }, {'_id': 1})

    /* All task plannings of selected employee Id */
    let taskPlannings = await MDL.TaskPlanningModel.find({'employee._id': mongoose.Types.ObjectId(employeeId)}).sort({'planningDate': 1})

    /* Conditions applied for filter according to required data and fromDate to toDate */
    if (fromDate && fromDate != 'undefined' && fromDate != undefined && toDate && toDate != 'undefined' && toDate != undefined) {
        taskPlannings = taskPlannings.filter(tp => U.momentInUTC(tp.planningDateString).isSameOrAfter(fromDateMomentTz) && U.momentInUTC(tp.planningDateString).isSameOrBefore(toDateMomentTz))
    }
    else if (fromDate && fromDate != 'undefined' && fromDate != undefined) {
        taskPlannings = taskPlannings.filter(tp => U.momentInUTC(tp.planningDateString).isSameOrAfter(fromDateMomentTz))
    }
    else if (toDate && toDate != 'undefined' && toDate != undefined) {
        taskPlannings = taskPlannings.filter(tp => U.momentInUTC(tp.planningDateString).isSameOrBefore(toDateMomentTz))
    }


    let now = new Date()
    let nowString = moment(now).format(SC.DATE_FORMAT)
    let nowMomentInUtc = momentTZ.tz(nowString, SC.DATE_FORMAT, SC.UTC_TIMEZONE).hour(0).minute(0).second(0).millisecond(0)

    /* Return of filtered task plannings and checking it can be merged or not */
    return taskPlannings.map(tp => {
        tp = tp.toObject()
        let check = U.momentInUTC(tp.planningDateString).isBefore(nowMomentInUtc) || !(releaseListOfID && releaseListOfID.findIndex(release => release._id.toString() === tp.release._id.toString()) != -1)
        if (check) {
            tp.canMerge = false
        } else {
            tp.canMerge = true
        }
        return tp
    })
}


/**
 *Get all task plannings of a release plan
 */

taskPlanningSchema.statics.getTaskPlansOfReleasePlan = async (releasePlanID, user) => {
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

    /*check user highest role in this release*/
    let userRolesInThisRelease = await MDL.ReleaseModel.getUserRolesInThisRelease(release._id, user)

    if (!U.includeAny([SC.ROLE_LEADER, SC.ROLE_MANAGER], userRolesInThisRelease)) {
        throw new AppError('Only user with role [' + SC.ROLE_MANAGER + ' or ' + SC.ROLE_LEADER + '] can fetch', EC.ACCESS_DENIED, EC.HTTP_FORBIDDEN)
    }

    /* fetch all task planning from release */
    return await MDL.TaskPlanningModel.find({'releasePlan._id': mongoose.Types.ObjectId(releasePlan._id)}).sort({'planningDate': 1})
}


/**
 * calendar
 */
/**
 * get all task plans of a loggedIn user

 */
taskPlanningSchema.statics.getAllTaskPlanningsForCalenderOfUser = async (user) => {
    /* fetch all task planning from release*/
    let taskPlans = await MDL.TaskPlanningModel.find({
        'employee._id': mongoose.Types.ObjectId(user._id)
    }, {
        task: 1,
        planningDateString: 1,
        planning: 1,
        report: 1,
        _id: 1,
        employee: 1
    })

    taskPlans.sort(function (a, b) {
        let planningDate1 = new Date(a.planningDateString)
        let planningDate2 = new Date(b.planningDateString)
        return planningDate1 < planningDate2 ? -1 : planningDate1 > planningDate2 ? 1 : 0
    })

    return taskPlans
}


/**
 * GetTaskAndProjectDetailForCalenderOfUser
 */

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


/*--------------------------------------------------------------GET_TASK_PLANS_END-------------------------------------------------------------------*/
/*-------------------------------------------------------COMMON_FUNCTIONS_CALL_SECTION_START---------------------------------------------------------------*/

const getNewProgressPercentage = (releasePlan, reportedStatus) => {


    let progress = 0

    if (reportedStatus && reportedStatus == SC.STATUS_COMPLETED) {
        // As status of this release plan is completed progress would be 1
        progress = 100
        logger.debug('getNewProgressPercentage(): reported status is completed progress would be 100 percent')
    } else {
        let baseHours = releasePlan.report.reportedHours + releasePlan.planning.plannedHours - releasePlan.report.plannedHoursReportedTasks
        // see if base hours crossed estimated hours, only then it would be considered as new base hours to calculate progress
        if (baseHours < releasePlan.task.estimatedHours) {
            baseHours = releasePlan.task.estimatedHours
        }
        logger.debug('getNewProgressPercentage(): [baseHours] ', {baseHours})
        // now that we have base hours we would calculate progress by comparing it against reported hours
        progress = releasePlan.report.reportedHours * 100 / baseHours
        logger.debug('getNewProgressPercentage(): [progress] ', {progress})
    }
    return progress.toFixed(2)
}

/**
 * Modify flags in all affected release plans/task plans due to generated warnings
 * @param generatedWarnings - Generated warnings due to any operation
 * @param releasePlan - Current Release plan
 * @param taskPlan - Current task plan
 * @returns
 * {
 *   affectedReleasePlans,
 *   affectedTaskPlans
 * }
 */
const updateFlags = async (generatedWarnings, releasePlan, taskPlan) => {

    // To avoid concurrency problems we would first fetch all release plan/task plans
    // that would be affected by warnings added/removed due to addition of this task plan
    // then we would update them by pushing/pulling flags
    // As a last step we would save all of them


    let releasePlanIDs = [];
    let taskPlanIDs = [];

    if (generatedWarnings.added && generatedWarnings.added.length) {
        let releasePlanWarnings = generatedWarnings.added.filter(w => w.warningType === SC.WARNING_TYPE_RELEASE_PLAN)
        let taskPlanWarnings = generatedWarnings.added.filter(w => w.warningType === SC.WARNING_TYPE_TASK_PLAN)

        releasePlanWarnings.map(w => w._id.toString()).reduce((rpIDs, wid) => {
            if (rpIDs.indexOf(wid) == -1)
                rpIDs.push(wid)
            return rpIDs
        }, releasePlanIDs)

        taskPlanWarnings.map(w => w._id.toString()).reduce((tpIDs, wid) => {
            if (tpIDs.indexOf(wid) == -1)
                tpIDs.push(wid)
            return tpIDs
        }, taskPlanIDs)

    }

    if (generatedWarnings.removed && generatedWarnings.removed.length) {
        let releasePlanWarnings = generatedWarnings.removed.filter(w => w.warningType === SC.WARNING_TYPE_RELEASE_PLAN)
        let taskPlanWarnings = generatedWarnings.removed.filter(w => w.warningType === SC.WARNING_TYPE_TASK_PLAN)

        releasePlanWarnings.map(w => w._id.toString()).reduce((rpIDs, wid) => {
            if (rpIDs.indexOf(wid) == -1)
                rpIDs.push(wid)
            return rpIDs
        }, releasePlanIDs)

        taskPlanWarnings.map(w => w._id.toString()).reduce((tpIDs, wid) => {
            if (tpIDs.indexOf(wid) == -1)
                tpIDs.push(wid)
            return tpIDs
        }, taskPlanIDs)
    }
    // Get releases and task plans

    let rpIDPromises = releasePlanIDs.map(rpID => {
        if (rpID.toString() === releasePlan._id.toString())
            return releasePlan;
        else
            return MDL.ReleasePlanModel.findById(mongoose.Types.ObjectId(rpID))
    })

    let tpIDPromises = taskPlanIDs.map(tpID => {
        if (tpID.toString() === taskPlan._id.toString())
            return taskPlan;
        else
            return MDL.TaskPlanningModel.findById(mongoose.Types.ObjectId(tpID))
    })

    let affectedReleasePlans = await Promise.all(rpIDPromises)
    let affectedTaskPlans = await Promise.all(tpIDPromises)

    // Now that we have got all the releasePlan/taskPlan IDs that would be affected by warning raised, we will update them accordingly
    if (generatedWarnings.added && generatedWarnings.added.length) {
        generatedWarnings.added.forEach(w => {
            if (w.warningType === SC.WARNING_TYPE_RELEASE_PLAN) {
                /*
                  During shifting it is possible that few task plans of same release had too many hours warning
                  and now they don't have that warning while other task plans didn't have those warnings and
                  now it has been added, in this case same release plan would be present in removed list as well
                  as added list and hence final flag would depend upon who wins the race while the correct behavior is
                  that a release plan should have too many hours flag if one of its task plan has that flag
                */

                logger.debug('[updateFlags]: warning [' + w.type + '] is added against release plan with id [' + w._id + ']')
                let affectedReleasePlan = affectedReleasePlans.find(arp => arp._id.toString() === w._id.toString())
                if (!affectedReleasePlan)
                    return;
                if (affectedReleasePlan.flags.indexOf(w.type) === -1)
                    affectedReleasePlan.flags.push(w.type)

            } else if (w.warningType === SC.WARNING_TYPE_TASK_PLAN) {
                logger.debug('[updateFlags]: warning [' + w.type + '] is added against task plan with id [' + w._id + ']')
                let affectedTaskPlan = affectedTaskPlans.find(atp => atp._id.toString() === w._id.toString())
                if (!affectedTaskPlan)
                    return;
                if (affectedTaskPlan.flags.indexOf(w.type) === -1)
                    affectedTaskPlan.flags.push(w.type)
            }
        })
    }

    if (generatedWarnings.removed && generatedWarnings.removed.length) {
        generatedWarnings.removed.forEach(w => {
            if (w.warningType === SC.WARNING_TYPE_RELEASE_PLAN) {
                logger.debug('[updateFlags]: warning [' + w.type + '] is removed against release plan with id [' + w._id + ']')
                let affectedReleasePlan = affectedReleasePlans.find(arp => arp._id.toString() === w._id.toString())
                if (!affectedReleasePlan)
                    return;

                if (affectedReleasePlan.flags.indexOf(w.type) > -1)
                    affectedReleasePlan.flags.pull(w.type)

            } else if (w.warningType === SC.WARNING_TYPE_TASK_PLAN) {
                logger.debug('[updateFlags]: warning [' + w.type + '] is removed against task plan with id [' + w._id + ']')
                let affectedTaskPlan = affectedTaskPlans.find(atp => atp._id.toString() === w._id.toString())
                if (!affectedTaskPlan)
                    return;
                if (affectedTaskPlan.flags.indexOf(w.type) > -1)
                    affectedTaskPlan.flags.pull(w.type)
            }
        })
    }

    // Now that all release plans/task plans are updated to add/remove flags based on generated warnings, it is time
    // save them and then return only once all save operation completes so that user interface is appropriately modified

    let rpSavePromises = affectedReleasePlans.map(rp => {
        logger.debug("Saving release plan ", {rp})
        return rp.save()
    })

    let tpSavePromises = affectedTaskPlans.map(tp => {
        logger.debug("Saving task plan ", {tp})
        return tp.save()
    })

    await Promise.all(rpSavePromises)
    await Promise.all(tpSavePromises)

    return {
        affectedReleasePlans,
        affectedTaskPlans
    }
}


/**
 * Modify flags in all affected release plans/task plans due to generated warnings on task plan shifting
 * @param generatedWarnings - Generated warnings due to any operation
 * @returns
 * {
 *   affectedReleasePlans,
 *   affectedTaskPlans
 * }
 */
const updateFlagsOnShift = async (generatedWarnings) => {

    // To avoid concurrency problems we would first fetch all release plan/task plans
    // that would be affected by warnings added/removed due to addition of this task plan
    // then we would update them by pushing/pulling flags
    // As a last step we would save all of them


    let releasePlanIDs = [];
    let taskPlanIDs = [];

    if (generatedWarnings.added && generatedWarnings.added.length) {
        let releasePlanWarnings = generatedWarnings.added.filter(w => w.warningType === SC.WARNING_TYPE_RELEASE_PLAN)
        let taskPlanWarnings = generatedWarnings.added.filter(w => w.warningType === SC.WARNING_TYPE_TASK_PLAN)

        releasePlanWarnings.map(w => w._id.toString()).reduce((rpIDs, wid) => {
            if (rpIDs.indexOf(wid) == -1)
                rpIDs.push(wid)
            return rpIDs
        }, releasePlanIDs)

        taskPlanWarnings.map(w => w._id.toString()).reduce((tpIDs, wid) => {
            if (tpIDs.indexOf(wid) == -1)
                tpIDs.push(wid)
            return tpIDs
        }, taskPlanIDs)
    }

    if (generatedWarnings.removed && generatedWarnings.removed.length) {
        let releasePlanWarnings = generatedWarnings.removed.filter(w => w.warningType === SC.WARNING_TYPE_RELEASE_PLAN)
        let taskPlanWarnings = generatedWarnings.removed.filter(w => w.warningType === SC.WARNING_TYPE_TASK_PLAN)

        releasePlanWarnings.map(w => w._id.toString()).reduce((rpIDs, wid) => {
            if (rpIDs.indexOf(wid) == -1)
                rpIDs.push(wid)
            return rpIDs
        }, releasePlanIDs)

        taskPlanWarnings.map(w => w._id.toString()).reduce((tpIDs, wid) => {
            if (tpIDs.indexOf(wid) == -1)
                tpIDs.push(wid)
            return tpIDs
        }, taskPlanIDs)
    }
    // Get releases and task plans

    let rpIDPromises = releasePlanIDs.map(rpID => {
        return MDL.ReleasePlanModel.findById(mongoose.Types.ObjectId(rpID))
    })

    let tpIDPromises = taskPlanIDs.map(tpID => {
        return MDL.TaskPlanningModel.findById(mongoose.Types.ObjectId(tpID))
    })

    let affectedReleasePlans = await Promise.all(rpIDPromises)
    let affectedTaskPlans = await Promise.all(tpIDPromises)

    // Now that we have got all the releasePlan/taskPlan IDs that would be affected by warning raised, we will update them accordingly

    if (generatedWarnings.removed && generatedWarnings.removed.length) {
        generatedWarnings.removed.forEach(w => {
            if (w.warningType === SC.WARNING_TYPE_RELEASE_PLAN) {
                logger.debug('[updateFlagsOnShift]: warning [' + w.type + '] is removed against release plan with id [' + w._id + ']')
                let affectedReleasePlan = affectedReleasePlans.find(arp => arp._id.toString() === w._id.toString())
                if (!affectedReleasePlan)
                    return;

                affectedReleasePlan.flags.pull(w.type)

            } else if (w.warningType === SC.WARNING_TYPE_TASK_PLAN) {
                logger.debug('[updateFlagsOnShift]: warning [' + w.type + '] is removed against task plan with id [' + w._id + ']')
                let affectedTaskPlan = affectedTaskPlans.find(atp => atp._id.toString() === w._id.toString())
                if (!affectedTaskPlan)
                    return;
                affectedTaskPlan.flags.pull(w.type)
            }
        })
    }


    if (generatedWarnings.added && generatedWarnings.added.length) {
        generatedWarnings.added.forEach(w => {
            if (w.warningType === SC.WARNING_TYPE_RELEASE_PLAN) {
                logger.debug('[updateFlagsOnShift]: warning [' + w.type + '] is added against release plan with id [' + w._id + ']')
                let affectedReleasePlan = affectedReleasePlans.find(arp => arp._id.toString() === w._id.toString())
                if (!affectedReleasePlan)
                    return;
                affectedReleasePlan.flags.push(w.type)

            } else if (w.warningType === SC.WARNING_TYPE_TASK_PLAN) {
                logger.debug('[updateFlagsOnShift]: warning [' + w.type + '] is added against task plan with id [' + w._id + ']')
                let affectedTaskPlan = affectedTaskPlans.find(atp => atp._id.toString() === w._id.toString())
                if (!affectedTaskPlan)
                    return;
                affectedTaskPlan.flags.push(w.type)
            }
        })
    }

    // Now that all release plans/task plans are updated to add/remove flags based on generated warnings, it is time
    // save them and then return only once all save operation completes so that user interface is appropriately modified

    let rpSavePromises = affectedReleasePlans.map(rp => {
        logger.debug("Saving release plan ", {rp})
        return rp.save()
    })

    let tpSavePromises = affectedTaskPlans.map(tp => {
        logger.debug("Saving task plan ", {tp})
        return tp.save()
    })

    await Promise.all(rpSavePromises)
    await Promise.all(tpSavePromises)

    return {
        affectedReleasePlans,
        affectedTaskPlans
    }
}


/**
 * to calculate working days and holidays
 */
const getWorkingDaysAndHolidays = async (from, to, taskPlanningDates) => {
    let holidayMomentList = await MDL.YearlyHolidaysModel.getAllHolidayMoments(from, to)
    logger.debug('[task-shift] holidays is ', {holidayDateList: holidayMomentList})
    /* Getting All Dates, AllWorkingDayList, AllTasksOnHolidayList, object ,Arrays and other Fields after calculation */
    let fromMoment = U.momentInUTC(from)
    let toMoment = U.momentInUTC(to)
    let AllDateList = []
    let AllWorkingDayList = []
    let AllTasksOnHolidayList = []

    while (fromMoment.isSameOrBefore(toMoment.clone())) {
        AllDateList.push(fromMoment.clone())
        /* date which is not part of holidays */
        if (holidayMomentList && holidayMomentList.length && holidayMomentList.findIndex(holidayMoment => holidayMoment.isSame(fromMoment)) !== -1) {
            /*Date is available in holiday list so we have to check that on that day any task is planned or not */
            if (taskPlanningDates && taskPlanningDates.length && taskPlanningDates.findIndex(taskPlanDate => U.momentInUTC(taskPlanDate).isSame(fromMoment)) !== -1) {
                // Some tasks are planned on holidays on this date, keeping index of how many working days have passed before this holiday date
                AllTasksOnHolidayList.push({date: fromMoment, index: AllWorkingDayList.length})
            }

        } else {
            /*Date is not a holiday date so it is included in working day list irrespective of there are task plannings or not*/
            AllWorkingDayList.push(fromMoment.clone())
        }
        /* increment of date */
        fromMoment = fromMoment.clone().add(1, 'days')
    }

    logger.debug('[shift-task]: [AllWorkingDayList] ', {AllWorkingDayList})
    logger.debug('[shift-task]: [AllDateList]', {AllDateList})
    logger.debug('[shift-task]: [AllTasksOnHolidayList]', {AllTasksOnHolidayList})

    return {
        AllTasksOnHolidayList,
        AllWorkingDayList,
        AllDateList,
        from,
        to,
        taskPlanningDates,
        holidayMomentList
    }
}


/*-------------------------------------------------COMMON_FUNCTIONS_CALL_SECTION_END---------------------------------------------------------------*/


/*-------------------------------------------------ADD_TASK_PLANNING_SECTION_START---------------------------------------------------------------*/

const updateEmployeeStaticsOnAddTaskPlanning = async (releasePlan, release, employee, plannedHourNumber) => {
    /* Add or update Employee Statistics Details when task is planned */
    /* Checking release plan  details  with  release and employee */
    if (await MDL.EmployeeStatisticsModel.count({
        'employee._id': mongoose.Types.ObjectId(employee._id),
        'release._id': mongoose.Types.ObjectId(release._id),
        'tasks._id': mongoose.Types.ObjectId(releasePlan._id),

    }) > 0) {

        /* Increased planned hours of release plan for  Already added employees statics details */
        let EmployeeStatisticsModelInput = {
            release: {
                _id: release._id.toString(),
                version: release.name
            },
            employee: {
                _id: employee._id.toString(),
                name: employee.firstName + ' ' + employee.lastName
            },
            task: {
                _id: releasePlan._id.toString(),
                name: releasePlan.task.name,
                plannedHours: plannedHourNumber,
                reportedHours: Number(0),
                plannedHoursReportedTasks: Number(0)
            }
        }
        return await MDL.EmployeeStatisticsModel.increaseTaskDetailsHoursToEmployeeStatistics(EmployeeStatisticsModelInput)

    } else if (await MDL.EmployeeStatisticsModel.count({
        'employee._id': mongoose.Types.ObjectId(employee._id),
        'release._id': mongoose.Types.ObjectId(release._id)
    }) > 0) {

        /* Add  release plan with planned hours for Already added employees statics details without release plan   */
        let EmployeeStatisticsModelInput = {
            release: {
                _id: release._id.toString(),
                version: release.name
            },
            employee: {
                _id: employee._id.toString(),
                name: employee.firstName + ' ' + employee.lastName
            },
            task: {
                _id: releasePlan._id.toString(),
                name: releasePlan.task.name,
                plannedHours: plannedHourNumber,
                reportedHours: 0,
                plannedHoursReportedTasks: 0
            }
        }
        return await MDL.EmployeeStatisticsModel.addTaskDetailsToEmployeeStatistics(EmployeeStatisticsModelInput)

    } else {
        /* Add employee statistics details with release plan and planned hours   */

        let EmployeeStatisticsModelInput = {
            release: {
                _id: release._id.toString(),
                version: release.name
            },
            employee: {
                _id: employee._id.toString(),
                name: employee.firstName + ' ' + employee.lastName
            },
            leaves: [],
            tasks: [
                {
                    _id: releasePlan._id.toString(),
                    name: releasePlan.task.name,
                    plannedHours: plannedHourNumber,
                    reportedHours: 0,
                    plannedHoursReportedTasks: 0
                }
            ]
        }
        return await MDL.EmployeeStatisticsModel.addEmployeeStatisticsDetails(EmployeeStatisticsModelInput)
    }
}

const addTaskPlanUpdateEmployeeDays = async (employee, plannedHourNumber, momentPlanningDate) => {

    // Add or update employee days details when task is planned
    // Check already added employees day detail or not
    if (await MDL.EmployeeDaysModel.count({
        'employee._id': employee._id.toString(),
        'date': momentPlanningDate
    }) > 0) {

        /* Update already added employee days details with increment of planned hours   */
        let EmployeeDaysModelInput = {
            plannedHours: plannedHourNumber,
            employee: {
                _id: employee._id.toString(),
                name: employee.firstName + ' ' + employee.lastName
            },
            dateString: momentPlanningDate.format(SC.DATE_FORMAT),
        }
        return await MDL.EmployeeDaysModel.increasePlannedHoursOnEmployeeDaysDetails(EmployeeDaysModelInput)
    } else {

        /*  Add employee days details with planned hour  if not added */
        let EmployeeDaysModelInput = {
            employee: {
                _id: employee._id.toString(),
                name: employee.firstName + ' ' + employee.lastName
            },
            plannedHours: plannedHourNumber,
            dateString: momentPlanningDate.format(SC.DATE_FORMAT),
        }

        return await MDL.EmployeeDaysModel.addEmployeeDaysDetails(EmployeeDaysModelInput)
    }
}

const addTaskPlanUpdateEmployeeRelease = async (releasePlan, release, employee, extra) => {

    const {plannedHours} = extra

    let employeeRelease = await MDL.EmployeeReleasesModel.findOne({
        'employee._id': mongoose.Types.ObjectId(employee._id),
        'release._id': mongoose.Types.ObjectId(release._id)
    })

    if (!employeeRelease) {
        // employee release not exists create one
        employeeRelease = new MDL.EmployeeReleasesModel()
        employeeRelease.employee = {
            _id: mongoose.Types.ObjectId(employee._id),
            name: employee.firstName + ' ' + employee.lastName
        }
        employeeRelease.release = {
            _id: mongoose.Types.ObjectId(release._id),
            name: release.name
        }
        employeeRelease.plannedHours = plannedHours
    } else {
        employeeRelease.plannedHours += plannedHours
    }
    return employeeRelease
}


const addTaskPlanUpdateReleasePlan = async (releasePlan, employee, plannedHourNumber, momentPlanningDate) => {

    /* As task plan is added we have to increase releasePlan planned hours, add one more task to overall count as well */

    releasePlan.planning.plannedHours += plannedHourNumber
    releasePlan.planning.plannedTaskCounts += 1

    // if total planned hours is less than estimated hours plannedHoursEstimatedTasks would change

    if (releasePlan.planning.plannedHours < releasePlan.task.estimatedHours) {
        releasePlan.diffPlannedHoursEstimatedTasks = releasePlan.planning.plannedHours - releasePlan.planning.plannedHoursEstimatedTasks
        releasePlan.planning.plannedHoursEstimatedTasks = releasePlan.planning.plannedHours
    }
    else {
        releasePlan.diffPlannedHoursEstimatedTasks = releasePlan.task.estimatedHours - releasePlan.planning.plannedHoursEstimatedTasks
        releasePlan.planning.plannedHoursEstimatedTasks = releasePlan.task.estimatedHours
    }

    let progress = getNewProgressPercentage(releasePlan)

    releasePlan.diffProgress = progress - releasePlan.report.progress
    releasePlan.report.progress = progress

    // reported hours by user + planned hours remaining would become new base hours for progress if it crosses current base hours

    if (!releasePlan.planning.minPlanningDate || momentPlanningDate.isBefore(releasePlan.planning.minPlanningDate)) {
        releasePlan.planning.minPlanningDate = momentPlanningDate.toDate()
    }
    if (!releasePlan.planning.maxPlanningDate || momentPlanningDate.isAfter(releasePlan.planning.maxPlanningDate)) {
        releasePlan.planning.maxPlanningDate = momentPlanningDate.toDate()
    }

    // Update employee planning data
    let employeePlanningIdx = -1
    if (releasePlan.planning.employees) {
        employeePlanningIdx = releasePlan.planning.employees.findIndex(e => {
            return e._id.toString() == employee._id.toString()
        })
    }


    if (employeePlanningIdx == -1) {
        // This employee has never been assigned any task for this release plan so add a new entry
        if (!releasePlan.planning.employees)
            releasePlan.planning.employees = []
        releasePlan.planning.employees.push({
            _id: employee._id,
            plannedHours: plannedHourNumber,
            minPlanningDate: momentPlanningDate.toDate(),
            maxPlanningDate: momentPlanningDate.toDate(),
            plannedTaskCounts: 1
        })
    } else {
        // This employee already has entry modify existing entry
        if (!releasePlan.planning.employees[employeePlanningIdx].minPlanningDate || momentPlanningDate.isBefore(releasePlan.planning.employees[employeePlanningIdx].minPlanningDate)) {
            releasePlan.planning.employees[employeePlanningIdx].minPlanningDate = momentPlanningDate
        }

        if (!releasePlan.planning.employees[employeePlanningIdx].maxPlanningDate || momentPlanningDate.isAfter(releasePlan.planning.employees[employeePlanningIdx].maxPlanningDate)) {
            releasePlan.planning.employees[employeePlanningIdx].maxPlanningDate = momentPlanningDate
        }
        releasePlan.planning.employees[employeePlanningIdx].plannedTaskCounts += 1
        releasePlan.planning.employees[employeePlanningIdx].plannedHours += plannedHourNumber

        // As new plan is added against an employee if this employee has reporting data we need to reset final status to pending
        if (Array.isArray(releasePlan.report.employees)) {
            let employeeReportIdx = releasePlan.report.employees.findIndex(e => {
                return e._id.toString() == employee._id.toString()
            })


            if (employeeReportIdx > -1) {
                releasePlan.report.employees[employeeReportIdx].finalStatus = SC.STATUS_PENDING
            }
        }

        // if final status has value it would be reset to pending

        if (releasePlan.report.finalStatus)
            releasePlan.report.finalStatus = SC.STATUS_PENDING

    }
    logger.debug('addTaskPlanning(): updated release plan', {releasePlan})

    return releasePlan
}

const addTaskPlanUpdateRelease = async (release, releasePlan, plannedHourNumber) => {
    // As task plan is added we have to increase release planned hours

    let iterationIndex = releasePlan.release.iteration.idx
    release.iterations[iterationIndex].plannedHours += plannedHourNumber

    if (releasePlan.diffProgress) {
        release.iterations[iterationIndex].progress += releasePlan.diffProgress * (releasePlan.task.estimatedHours / release.iterations[iterationIndex].estimatedHours)
        release.iterations[iterationIndex].progress = release.iterations[iterationIndex].progress.toFixed(2)
    }

    if (releasePlan.diffPlannedHoursEstimatedTasks) {
        release.iterations[iterationIndex].plannedHoursEstimatedTasks += releasePlan.diffPlannedHoursEstimatedTasks
    }

    logger.debug('addTaskPlanning(): [updated release]: ', {release})
    return release
}


const addTaskPlanCreateTaskPlan = async (releasePlan, release, employee, plannedHourNumber, momentPlanningDate, taskPlanningInput) => {
    let taskPlan = new TaskPlanningModel()
    taskPlan.created = Date.now()
    taskPlan.planningDate = momentPlanningDate
    taskPlan.planningDateString = momentPlanningDate.format(SC.DATE_FORMAT)
    taskPlan.task = releasePlan.task
    taskPlan.release = release
    taskPlan.releasePlan = releasePlan
    taskPlan.employee = Object.assign({}, employee.toObject(), {name: ((employee.firstName ? employee.firstName + ' ' : '') + (employee.lastName ? employee.lastName : ''))})
    taskPlan.planning = {plannedHours: plannedHourNumber}
    taskPlan.description = taskPlanningInput.description ? taskPlanningInput.description : ''
    taskPlan.iterationType = releasePlan.release.iteration.iterationType
    taskPlan.report = {
        status: SC.REPORT_UNREPORTED
    }

    logger.debug('addTaskPlanning(): [newly created task plan] task plan is ', {taskPlan})

    return taskPlan
}

/***
 * Create new task planning  in which logged in user is involved as a manager or leader
 ***/
taskPlanningSchema.statics.addTaskPlan = async (taskPlanningInput, user, schemaRequested) => {
    if (schemaRequested)
        return V.generateSchema(V.releaseTaskPlanningStruct)

    V.validate(taskPlanningInput, V.releaseTaskPlanningStruct)

    // Perform all validations as first step
    let release = await MDL.ReleaseModel.findById(taskPlanningInput.release._id)
    if (!release) {
        throw new AppError('Release not found', EC.NOT_FOUND, EC.HTTP_BAD_REQUEST)
    }
    let releasePlan = await MDL.ReleasePlanModel.findById(taskPlanningInput.releasePlan._id)
    if (!releasePlan) {
        throw new AppError('Release Plan not found', EC.NOT_FOUND, EC.HTTP_BAD_REQUEST)
    }
    // Get all roles user have in this release
    let userRolesInThisRelease = await MDL.ReleaseModel.getUserRolesInThisRelease(release._id, user)
    if (!U.includeAny([SC.ROLE_LEADER, SC.ROLE_MANAGER], userRolesInThisRelease)) {
        throw new AppError('Only user with role [' + SC.ROLE_MANAGER + ' or ' + SC.ROLE_LEADER + '] can plan task', EC.ACCESS_DENIED, EC.HTTP_FORBIDDEN)
    }

    let selectedEmployee = await MDL.UserModel.findById(mongoose.Types.ObjectId(taskPlanningInput.employee._id)).exec()
    if (!selectedEmployee) {
        throw new AppError('Employee Not Found', EC.NOT_FOUND, EC.HTTP_BAD_REQUEST)
    }

    let momentPlanningDate = U.momentInUTC(taskPlanningInput.planningDate)
    let momentPlanningDateIndia = U.momentInTimeZone(taskPlanningInput.planningDate, SC.INDIAN_TIMEZONE)
    // add 1 day to this date
    momentPlanningDateIndia.add(1, 'days')
    if (momentPlanningDateIndia.isBefore(new Date())) {
        throw new AppError('Cannot add planning for past date', EC.TIME_OVER, EC.HTTP_BAD_REQUEST)
    }

    /* Conversion of planned hours in number format */
    let plannedHourNumber = Number(taskPlanningInput.planning.plannedHours)

    if (plannedHourNumber <= 0)
        throw new AppError('Planned hours need to be positive number', EC.BAD_ARGUMENTS, EC.HTTP_BAD_REQUEST)

    /* Task cannot be planned against an employee if it is already marked as 'completed' by that employee. To remove that check, manager/leader would have
       to reopen that task against an employee
    */

    let employeeReportIdx = releasePlan.report.employees.findIndex(e => {
        return e._id.toString() === selectedEmployee._id.toString()
    })

    if (employeeReportIdx > -1) {
        // check to see if employee has reported this task as completed if 'yes', task cannot be planned against this employee
        if (releasePlan.report.employees[employeeReportIdx].finalStatus === SC.REPORT_COMPLETED)
            throw new AppError('Employee reported this task as [' + SC.REPORT_COMPLETED + ']. Cannot plan until reopen.', EC.CANT_PLAN, EC.HTTP_BAD_REQUEST)
    }

    /* Get employee roles in this project that this task is planned against*/
    let employeeRolesInThisRelease = await MDL.ReleaseModel.getUserRolesInThisRelease(release._id, selectedEmployee)

    if (!U.includeAny(SC.ROLE_DEVELOPER, employeeRolesInThisRelease)) {
        /* This means that employee is not a developer in this release, so this is extra employee being arranged outside of release
           or manager/leader of this release are now working on this task and hence became ad developer of this release
         */

        // Only manager is allowed to rope in people outside of developer team assigned to this release so check if logged in user is manager
        if (!U.includeAny(SC.ROLE_MANAGER, userRolesInThisRelease)) {
            throw new AppError('Only manager of release can rope in additional employee for Release', EC.NOT_ALLOWED_TO_ADD_EXTRA_EMPLOYEE, EC.HTTP_FORBIDDEN)
        }

        // See if this employee is already roped in for this project if not add it as a non project user
        if (!U.includeAny(SC.ROLE_NON_PROJECT_DEVELOPER, employeeRolesInThisRelease)) {
            // this is an extra employee note down
            if (!release.nonProjectTeam)
                release.nonProjectTeam = []

            release.nonProjectTeam.push({
                '_id': selectedEmployee._id.toString(),
                'name': selectedEmployee.firstName + ' ' + selectedEmployee.lastName,
                'email': selectedEmployee.email,
            })
        }
    }
    // ### All validations should be performed above, it is assumed that things are valid beyond this line ###

    // this code should be placed before updating release plan else max planning date would be changed
    let employeePlanningIdx = releasePlan.planning.employees.findIndex(e => e._id.toString() === selectedEmployee._id.toString())

    let plannedAfterMaxDate = false
    if (employeePlanningIdx > -1 && releasePlan.planning.employees[employeePlanningIdx].maxPlanningDate && momentPlanningDate.isAfter(releasePlan.planning.employees[employeePlanningIdx].maxPlanningDate)) {
        plannedAfterMaxDate = true
    }

    /*-------------------------------- EMPLOYEE DAYS UPDATE SECTION -------------------------------------------*/
    await addTaskPlanUpdateEmployeeDays(selectedEmployee, plannedHourNumber, momentPlanningDate)

    /*-------------------------------- EMPLOYEE RELEASE UPDATE SECTION -------------------------------------------*/
    let employeeRelease = await addTaskPlanUpdateEmployeeRelease(releasePlan, release, selectedEmployee, {
        plannedHours: plannedHourNumber
    })

    // Get updated release/release plan objects
    /*-------------------------------- RELEASE PLAN UPDATE SECTION --------
    -----------------------------------*/
    releasePlan = await addTaskPlanUpdateReleasePlan(releasePlan, selectedEmployee, plannedHourNumber, momentPlanningDate)

    /*-------------------------------- RELEASE UPDATE SECTION -------------------------------------------*/
    release = await addTaskPlanUpdateRelease(release, releasePlan, plannedHourNumber)

    /*-------------------------------- TASK PLAN CREATE SECTION -------------------------------------------*/
    let taskPlan = await addTaskPlanCreateTaskPlan(releasePlan, release, selectedEmployee, plannedHourNumber, momentPlanningDate, taskPlanningInput)

    /*--------------------------------- WARNING UPDATE SECTION ---------------------------------------------*/
    let generatedWarnings = await MDL.WarningModel.taskPlanAdded(taskPlan, releasePlan, release, selectedEmployee, plannedHourNumber, momentPlanningDate, releasePlan.planning.plannedTaskCounts == 1, plannedAfterMaxDate)
    logger.debug('addTaskPlanning :=> Add task plan generatedWarnings: ALL Warnings:', {generatedWarnings})
    // Get release/task plans objects that are affected due to these warnings
    let {affectedTaskPlans} = await updateFlags(generatedWarnings, releasePlan, taskPlan)

    // Make final saves and return response
    await employeeRelease.save()
    await release.save()
    await releasePlan.save()
    await taskPlan.save()

    return {
        taskPlan,
        warnings: generatedWarnings,
        taskPlans: affectedTaskPlans
    }
}
/*-------------------------------------------------ADD_TASK_PLANNING_SECTION_END---------------------------------------------------------------*/

/*-------------------------------------------------DELETE_TASK_PLANNING_SECTION_START----------------------------------------------------------*/

const updateEmployeeReleaseOnDeleteTaskPlanning = async (taskPlan, releasePlan, release, employee) => {

    let employeeRelease = await MDL.EmployeeReleasesModel.findOne({
        'employee._id': mongoose.Types.ObjectId(employee._id),
        'release._id': mongoose.Types.ObjectId(release._id)
    })

    if (!employeeRelease)
        throw new AppError('Employee release should have found on delete task plan. ', EC.DATA_INCONSISTENT, EC.HTTP_SERVER_ERROR)

    // Reduce planned hours
    employeeRelease.plannedHours -= taskPlan.planning.plannedHours
    return employeeRelease
}


const EmployeeStatisticsUpdateOnDeleteTaskPlanning = async (taskPlan, releasePlan, employee, plannedHourNumber, user) => {
    /* when task plan is removed we have to decrease employee statistics  planned hours*/
    let EmployeeStatisticsModelInput = {
        release: {
            _id: taskPlan.release._id.toString(),
        },
        employee: {
            _id: employee._id.toString(),
        },
        task: {
            _id: releasePlan._id.toString(),
            plannedHours: plannedHourNumber,
            reportedHours: Number(0),
            plannedHoursReportedTasks: Number(0)
        }
    }
    return await MDL.EmployeeStatisticsModel.decreaseTaskDetailsHoursToEmployeeStatistics(EmployeeStatisticsModelInput, user)
}


const employeeDaysUpdateOnDeleteTaskPlanning = async (taskPlan, employee, plannedHourNumber, user) => {

    /* when task plan is removed we have to decrease employee days  planned hours */
    let oldEmployeeDaysModelInput = {
        plannedHours: plannedHourNumber,
        employee: {
            _id: employee._id.toString(),
            name: taskPlan.employee.name
        },
        dateString: taskPlan.planningDateString,
    }
    return await MDL.EmployeeDaysModel.decreasePlannedHoursOnEmployeeDaysDetails(oldEmployeeDaysModelInput, user)
}


const releasePlanUpdateOnDeleteTaskPlanning = async (taskPlan, releasePlan, employee, plannedHourNumber) => {
    // due to task plan deletion reduce planned hours & task count

    releasePlan.planning.plannedHours -= plannedHourNumber
    releasePlan.planning.plannedTaskCounts -= 1

    if (releasePlan.planning.plannedHours < releasePlan.task.estimatedHours) {
        releasePlan.diffPlannedHoursEstimatedTasks = releasePlan.planning.plannedHours - releasePlan.planning.plannedHoursEstimatedTasks
        releasePlan.planning.plannedHoursEstimatedTasks = releasePlan.planning.plannedHours
    }
    else {
        releasePlan.diffPlannedHoursEstimatedTasks = 0
        releasePlan.planning.plannedHoursEstimatedTasks = releasePlan.task.estimatedHours
    }

    let progress = getNewProgressPercentage(releasePlan)
    releasePlan.diffProgress = progress - releasePlan.report.progress
    releasePlan.report.progress = progress


    /* SEE IF THIS DELETION CAUSES ANY CHANGE IN MIN/MAX PLANNING DATE IN RELEASE PLAN */

    let momentPlanningDate = new moment(taskPlan.planningDate)

    // Update common planning data
    if (releasePlan.planning.plannedTaskCounts == 0) {
        // This is last task associated with this release plan so reset min/max planning date
        releasePlan.planning.minPlanningDate = undefined
        releasePlan.planning.maxPlanningDate = undefined
    } else {
        if (momentPlanningDate.isSame(releasePlan.planning.minPlanningDate)) {
            /*
              This means when a task is deleted with date same as minimum planning date, this could make changes to minimum planning date ,if this is the only task
              on minimum planning date
             */
            let otherTaskCount = await MDL.TaskPlanningModel.count({
                'planningDate': taskPlan.planningDate,
                '_id': {$ne: mongoose.Types.ObjectId(taskPlan._id)},
                'releasePlan._id': mongoose.Types.ObjectId(taskPlan.releasePlan._id)
            })
            //logger.debug('other task count having same date as planning data is ', {otherTaskCount})
            if (otherTaskCount == 0) {
                let results = await MDL.TaskPlanningModel.aggregate(
                    {
                        $match: {
                            'releasePlan._id': mongoose.Types.ObjectId(taskPlan.releasePlan._id),
                            '_id': {$ne: mongoose.Types.ObjectId(taskPlan._id)}
                        }
                    },
                    {
                        $group: {
                            '_id': 'taskPlanning.releasePlan._id',
                            'minPlanningDate': {
                                '$min': '$planningDate'
                            }
                        }
                    }
                )

                if (results && results.length > 0) {
                    releasePlan.planning.minPlanningDate = results[0].minPlanningDate
                }
            }
        }

        if (momentPlanningDate.isSame(releasePlan.planning.maxPlanningDate)) {
            /*
              This means a task is deleted with date same as maximum planning date, this could make changes to maximum planning date if this is the only task
              on maximum planning date
             */

            let otherTaskCount = await MDL.TaskPlanningModel.count({
                'planningDate': taskPlan.planningDate,
                '_id': {$ne: mongoose.Types.ObjectId(taskPlan._id)},
                'releasePlan._id': mongoose.Types.ObjectId(taskPlan.releasePlan._id)
            })
            logger.debug('other task count having same date as planning data is ', {otherTaskCount})
            if (otherTaskCount == 0) {
                let results = await MDL.TaskPlanningModel.aggregate(
                    {
                        $match: {
                            'releasePlan._id': mongoose.Types.ObjectId(taskPlan.releasePlan._id),
                            '_id': {$ne: mongoose.Types.ObjectId(taskPlan._id)}
                        }
                    },
                    {
                        $group: {
                            '_id': 'taskPlanning.releasePlan._id',
                            'maxPlanningDate': {'$max': '$planningDate'}
                        }
                    })

                if (results && results.length > 0) {
                    releasePlan.planning.maxPlanningDate = results[0].maxPlanningDate
                }
                logger.debug('results found as ', {results})
            }
        }
    }

    // Update employee specific planning data
    // As task of employee is deleted we should find employee planning index below
    let employeePlanningIdx = releasePlan.planning.employees.findIndex(e => {
        return e._id.toString() == employee._id.toString()
    })

    if (employeePlanningIdx == -1) {
        throw new AppError('Employee index in planning.employees should have been found for delete task.', EC.DATA_INCONSISTENT, EC.HTTP_SERVER_ERROR)
    }

    releasePlan.planning.employees[employeePlanningIdx].plannedTaskCounts -= 1

    if (releasePlan.planning.employees[employeePlanningIdx].plannedTaskCounts == 0) {
        // This is last task against this employee in this release plan so remove employee section
        releasePlan.planning.employees[employeePlanningIdx].remove()
    } else {
        releasePlan.planning.employees[employeePlanningIdx].plannedHours -= plannedHourNumber
        if (momentPlanningDate.isSame(releasePlan.planning.employees[employeePlanningIdx].minPlanningDate)) {
            /*
              This means a task is deleted with date same as minimum planning date for employee, this could make changes to minimum planning date if this is the only task
              on minimum planning date
             */
            let otherTaskCount = await MDL.TaskPlanningModel.count({
                'planningDate': taskPlan.planningDate,
                'employee._id': employee._id,
                '_id': {$ne: mongoose.Types.ObjectId(taskPlan._id)},
                'releasePlan._id': mongoose.Types.ObjectId(taskPlan.releasePlan._id)
            })
            logger.debug('empmloyee-specific planning changes minplanning date, other task count having same date as planning data is ', {otherTaskCount})
            if (otherTaskCount == 0) {
                let results = await MDL.TaskPlanningModel.aggregate(
                    {
                        $match: {
                            'releasePlan._id': mongoose.Types.ObjectId(taskPlan.releasePlan._id),
                            'employee._id': employee._id,
                            '_id': {$ne: mongoose.Types.ObjectId(taskPlan._id)}
                        }
                    },
                    {
                        $group: {
                            '_id': 'taskPlanning.releasePlan._id',
                            'minPlanningDate': {
                                '$min': '$planningDate'
                            }
                        }
                    }
                )

                if (results && results.length > 0) {
                    releasePlan.planning.employees[employeePlanningIdx].minPlanningDate = results[0].minPlanningDate
                }
            }
        }

        if (momentPlanningDate.isSame(releasePlan.planning.employees[employeePlanningIdx].maxPlanningDate)) {
            /*
              This means a task is deleted with date same as minimum planning date for employee, this could make changes to minimum planning date if this is the only task
              on minimum planning date
             */
            let otherTaskCount = await MDL.TaskPlanningModel.count({
                'planningDate': taskPlan.planningDate,
                'employee._id': employee._id,
                '_id': {$ne: mongoose.Types.ObjectId(taskPlan._id)},
                'releasePlan._id': mongoose.Types.ObjectId(taskPlan.releasePlan._id)
            })
            if (otherTaskCount == 0) {
                let results = await MDL.TaskPlanningModel.aggregate(
                    {
                        $match: {
                            'releasePlan._id': mongoose.Types.ObjectId(taskPlan.releasePlan._id),
                            'employee._id': employee._id,
                            '_id': {$ne: mongoose.Types.ObjectId(taskPlan._id)}
                        }
                    },
                    {
                        $group: {
                            '_id': 'taskPlanning.releasePlan._id',
                            'maxPlanningDate': {
                                '$max': '$planningDate'
                            }
                        }
                    }
                )
                if (results && results.length > 0) {
                    releasePlan.planning.employees[employeePlanningIdx].maxPlanningDate = results[0].maxPlanningDate
                }
            }
        }
    }
    if (releasePlan.planning.plannedTaskCounts === 0) {
        // this means that this was the last task plan against release plan, so we would have to add unplanned warning again
        releasePlan.flags.push(SC.WARNING_UNPLANNED)
    }
    logger.info('deleteTaskPlanning(): [release plan update ] releasePlan is ', {releasePlan})

    return releasePlan
}


const releaseUpdateOnDeleteTaskPlanning = async (taskPlan, releasePlan, release, plannedHourNumber) => {

    let iterationIndex = releasePlan.release.iteration.idx
    release.iterations[iterationIndex].plannedHours -= plannedHourNumber
    if (releasePlan.diffProgress) {
        logger.debug('deleteTaskPlanning(): [progress] diff progress is ', {diffHours: releasePlan.diffProgress})
        release.iterations[iterationIndex].progress += releasePlan.diffProgress * (releasePlan.task.estimatedHours / release.iterations[iterationIndex].estimatedHours)
        release.iterations[iterationIndex].progress = release.iterations[iterationIndex].progress.toFixed(2)
    }

    if (releasePlan.diffPlannedHoursEstimatedTasks) {
        logger.debug('deleteTaskPlanning(): [diffPlannedHoursEstimatedTasks] diff progress is ', {diffPlannedHoursEstimatedTasks: releasePlan.diffPlannedHoursEstimatedTasks})
        release.iterations[iterationIndex].plannedHoursEstimatedTasks += releasePlan.diffPlannedHoursEstimatedTasks
    }

    return release
}

/**
 * Delete task planning
 **/
taskPlanningSchema.statics.deleteTaskPlanning = async (taskPlanID, user) => {
    let taskPlan = await MDL.TaskPlanningModel.findById(mongoose.Types.ObjectId(taskPlanID))
    if (!taskPlan) {
        throw new AppError('Invalid task plan', EC.INVALID_OPERATION, EC.HTTP_BAD_REQUEST)
    }

    let releasePlan = await MDL.ReleasePlanModel.findById(mongoose.Types.ObjectId(taskPlan.releasePlan._id))
    if (!releasePlan) {
        throw new AppError(EM.RELEASE_PLAN_NOT_FOUND, EC.NOT_FOUND, EC.HTTP_BAD_REQUEST)
    }

    let release = await MDL.ReleaseModel.findById(mongoose.Types.ObjectId(taskPlan.release._id))
    if (!release) {
        throw new AppError('Release not found', EC.NOT_FOUND, EC.HTTP_BAD_REQUEST)
    }

    //check user highest role in this release
    let userRolesInThisRelease = await MDL.ReleaseModel.getUserRolesInThisRelease(taskPlan.release._id, user)
    if (!userRolesInThisRelease) {
        throw new AppError('User is not part of this release.', EC.ACCESS_DENIED, EC.HTTP_FORBIDDEN)
    }
    if (!U.includeAny([SC.ROLE_LEADER, SC.ROLE_MANAGER], userRolesInThisRelease)) {
        throw new AppError('Only user with role [' + SC.ROLE_MANAGER + ' or ' + SC.ROLE_LEADER + '] can delete plan task', EC.ACCESS_DENIED, EC.HTTP_FORBIDDEN)
    }

    let employee = await MDL.UserModel.findById(mongoose.Types.ObjectId(taskPlan.employee._id)).exec()
    if (!employee) {
        throw new AppError('Employee Not Found', EC.NOT_FOUND, EC.HTTP_BAD_REQUEST)
    }


    /**
     * A task plan can only be deleted before or on date it is planned after that it cannot be deleted.
     * Now here is tricky part, the date is over or not is based on timezone, for now we will consider timezone of project as indian time zone
     * So first we will get to that date which is 12:00 am of next day of planned date and then we will compare it with now
     */

    let momentPlanningDateIndia = U.momentInTimeZone(taskPlan.planningDateString, SC.INDIAN_TIMEZONE)
    // add 1 day to this date
    momentPlanningDateIndia.add(1, 'days')

    //logger.debug('moment planning date india ', {momentPlanningDateIndia})

    if (momentPlanningDateIndia.isBefore(new Date())) {
        throw new AppError('Planning date is already over, cannot delete planning now', EC.TIME_OVER, EC.HTTP_BAD_REQUEST)
    }

    let plannedHourNumber = Number(taskPlan.planning.plannedHours)


    /*------------------------------ EMPLOYEE STATISTICS UPDATES ----------------------------------------------*/
    let employeeRelease = await updateEmployeeReleaseOnDeleteTaskPlanning(taskPlan, releasePlan, release, employee)

    /*------------------------------ EMPLOYEE DAYS UPDATES --------------------------------------------*/
    await employeeDaysUpdateOnDeleteTaskPlanning(taskPlan, employee, plannedHourNumber, user)

    /*------------------------------- RELEASE PLAN UPDATES ------------------------------------------------------*/
    releasePlan = await releasePlanUpdateOnDeleteTaskPlanning(taskPlan, releasePlan, employee, plannedHourNumber)

    /*------------------------------- RELEASE UPDATES ---------------------------------------------------*/
    release = await releaseUpdateOnDeleteTaskPlanning(taskPlan, releasePlan, release, plannedHourNumber)

    /*------------------------------- WARNING UPDATES ---------------------------------------------------*/
    let generatedWarnings = await MDL.WarningModel.taskPlanDeleted(taskPlan, releasePlan, release)
    logger.debug('deleteTaskPlanning(): [all-warning-responses] => generatedWarnings => ', {generatedWarnings})

    let {affectedTaskPlans} = await updateFlags(generatedWarnings, releasePlan, taskPlan)
    await taskPlan.remove()

    await employeeRelease.save()
    await releasePlan.save()
    await release.save()
    /* remove task planning */
    return {warnings: generatedWarnings, taskPlan: taskPlan, taskPlans: affectedTaskPlans}
}
/*-------------------------------------------------DELETE_TASK_PLANNING_SECTION_END----------------------------------------------------------*/

/*-------------------------------------------------MERGE_TASK_PLANNING_SECTION_START----------------------------------------------------------*/

/**
 *  merge task plan to another date
 **/
taskPlanningSchema.statics.mergeTaskPlanning = async (taskPlanningInput, user, schemaRequested) => {
    if (schemaRequested)
        return V.generateSchema(V.releaseMergeTaskPlanningStruct)

    V.validate(taskPlanningInput, V.releaseMergeTaskPlanningStruct)

    /* Conversion of now and dates into moment */
    let now = new Date()

    let todaysDateInIndia = U.momentInTimeZone(U.formatDateInTimezone(new Date(), SC.INDIAN_TIMEZONE), SC.INDIAN_TIMEZONE)
    let rePlanningDateInIndia = U.momentInTimeZone(taskPlanningInput.rePlanningDate, SC.INDIAN_TIMEZONE)

    let rePlanningDateUtc = U.dateInUTC(taskPlanningInput.rePlanningDate)

    /*Checking that  new planning date is a valid date or not */
    /*Checking that new planning date  is before now or not */

    if (todaysDateInIndia.isAfter(rePlanningDateInIndia)) {
        throw new AppError('Can not merge before now', EC.INVALID_OPERATION, EC.HTTP_BAD_REQUEST)
    }

    let taskPlan = await MDL.TaskPlanningModel.findById(mongoose.Types.ObjectId(taskPlanningInput._id))
    if (!taskPlan) {
        throw new AppError('Invalid task plan', EC.INVALID_OPERATION, EC.HTTP_BAD_REQUEST)
    }
    let taskPlanningDateInIndia = U.momentInTimeZone(taskPlan.planningDateString, SC.INDIAN_TIMEZONE)

    // Tasks of past dates cannot be merged
    if (taskPlanningDateInIndia.isBefore(todaysDateInIndia)) {
        throw new AppError('Cannot merge tasks having past dates', EC.TIME_OVER, EC.HTTP_BAD_REQUEST)
    }

    let releasePlan = await MDL.ReleasePlanModel.findById(mongoose.Types.ObjectId(taskPlanningInput.releasePlan._id))
    if (!releasePlan) {
        throw new AppError('ReleasePlan not found', EC.NOT_FOUND, EC.HTTP_BAD_REQUEST)
    }


    let selectedEmployee = await MDL.UserModel.findById(mongoose.Types.ObjectId(taskPlan.employee._id)).exec()
    if (!selectedEmployee) {
        throw new AppError('Employee Not Found', EC.NOT_FOUND, EC.HTTP_BAD_REQUEST)
    }

    let release = await MDL.ReleaseModel.findById(mongoose.Types.ObjectId(releasePlan.release._id))
    if (!release) {
        throw new AppError('Release associated with release plan is not found', EC.DATA_INCONSISTENT, EC.HTTP_BAD_REQUEST)
    }

    let userRolesInThisRelease = await MDL.ReleaseModel.getUserRolesInThisRelease(release._id, user)
    if (!U.includeAny([SC.ROLE_LEADER, SC.ROLE_MANAGER], userRolesInThisRelease)) {
        throw new AppError('Only user with role [' + SC.ROLE_MANAGER + ' or ' + SC.ROLE_LEADER + '] can merge task', EC.ACCESS_DENIED, EC.HTTP_FORBIDDEN)
    }

    /* Conversion of planned hours in number format */
    let plannedHourNumber = taskPlan.planning.plannedHours

    /******************************** EMPLOYEE DAYS UPDATE **************************************************/

        // Employee days of existing date and merged date would be modified

    let existingDateEmployeeDays = await MDL.EmployeeDaysModel.findOne({
            'employee._id': mongoose.Types.ObjectId(selectedEmployee._id),
            'date': taskPlan.planningDate
        })

    let rePlannedDateEmployeeDays = await MDL.EmployeeDaysModel.findOne({
        'employee._id': mongoose.Types.ObjectId(selectedEmployee._id),
        'date': rePlanningDateUtc
    })

    if (existingDateEmployeeDays) {
        // Total hours would be reduced
        existingDateEmployeeDays.plannedHours -= plannedHourNumber
        await existingDateEmployeeDays.save()
    } else {
        throw new AppError('There should be an employee days entry for task that is merged', EC.DATA_INCONSISTENT, EC.HTTP_SERVER_ERROR)
    }

    if (rePlannedDateEmployeeDays) {
        rePlannedDateEmployeeDays.plannedHours += plannedHourNumber
        await rePlannedDateEmployeeDays.save()
    } else {
        // create employee days as not exists
        rePlannedDateEmployeeDays = new MDL.EmployeeDaysModel()
        rePlannedDateEmployeeDays.date = rePlanningDateUtc
        rePlannedDateEmployeeDays.dateString = U.formatDateInUTC(rePlanningDateUtc)
        rePlannedDateEmployeeDays.employee = taskPlan.employee
        rePlannedDateEmployeeDays.plannedHours = plannedHourNumber
        await rePlannedDateEmployeeDays.save()
    }

    logger.debug("[ taskPlanMerged ]:()=> UPDATED: existing date employee days ", {existingDateEmployeeDays})
    logger.debug("[ taskPlanMerged ]:()=>: UPDATED: rePlaning date employee days ", {rePlannedDateEmployeeDays})

    let generatedWarnings = await MDL.WarningModel.taskPlanMerged(taskPlan, releasePlan, release, existingDateEmployeeDays, rePlannedDateEmployeeDays, selectedEmployee)
    logger.debug("[ taskPlanMerged ]:()=> generatedWarnings ", {generatedWarnings})

    // update flags
    let {affectedTaskPlans} = await updateFlags(generatedWarnings, releasePlan, taskPlan)
    taskPlan.created = Date.now()
    taskPlan.planningDate = rePlanningDateUtc
    taskPlan.planningDateString = taskPlanningInput.rePlanningDate
    await taskPlan.save()
    taskPlan = taskPlan.toObject()
    taskPlan.canMerge = true
    return {warnings: generatedWarnings, taskPlan: taskPlan, taskPlans: affectedTaskPlans}
}

/*-------------------------------------------------MERGE_TASK_PLANNING_SECTION_END----------------------------------------------------------*/


/*
 Shifting task plans to future
  */
taskPlanningSchema.statics.planningShiftToFuture = async (planning, user, schemaRequested) => {
    if (schemaRequested)
        return V.generateSchema(V.releaseTaskPlanningShiftStruct)

    V.validate(planning, V.releaseTaskPlanningShiftStruct)

    /* Days to shift is converted in number*/
    let daysToShiftNumber = Number(planning.daysToShift)

    let employee = await MDL.UserModel.findById(mongoose.Types.ObjectId(planning.employeeId))
    if (!employee)
        throw new AppError('Not a valid user', EC.ACCESS_DENIED, EC.HTTP_BAD_REQUEST)

    /* Base Date in UTC */
    let baseDateMomentInUtc = U.momentInUTC(planning.baseDate)

    // Get toDays date in indian time zone and then convert it into UTC for comparison
    let toDaysMoment = U.momentInUTC(U.formatDateInTimezone(new Date(), SC.INDIAN_TIMEZONE))

    /* can not shift task whose planning date is before now */
    if (baseDateMomentInUtc.isBefore(toDaysMoment)) {
        throw new AppError('Can not shift previous tasks', EC.ACCESS_DENIED, EC.HTTP_BAD_REQUEST)
    }

    /* checking that ReleasePlan is valid or not */
    let releasePlan = await MDL.ReleasePlanModel.findById(planning.releasePlanID)
    if (!releasePlan)
        throw new AppError('Not a valid release plan', EC.ACCESS_DENIED, EC.HTTP_BAD_REQUEST)

    /* checking that Release is valid or not */
    let release = await MDL.ReleaseModel.findById(mongoose.Types.ObjectId(releasePlan.release._id))
    if (!release)
        throw new AppError('Not a valid release', EC.ACCESS_DENIED, EC.HTTP_BAD_REQUEST)

    /* checking user role in this release */
    let userRolesInThisRelease = await MDL.ReleaseModel.getUserRolesInThisRelease(release._id, user)

    if (!U.includeAny([SC.ROLE_LEADER, SC.ROLE_MANAGER], userRolesInThisRelease)) {
        throw new AppError('Only user with role [' + SC.ROLE_MANAGER + ' or ' + SC.ROLE_LEADER + '] can shift', EC.ACCESS_DENIED, EC.HTTP_FORBIDDEN)
    }

    /* Fetch all task plannings on/after base date for this release against this employee id  */
    /* Get selected employee`s task plannings for this release, task plans of other releases would not be impacted */
    let taskPlanningDates = await MDL.TaskPlanningModel.distinct(
        'planningDateString',
        {
            'employee._id': employee._id,
            'planningDate': {$gte: baseDateMomentInUtc},
            'release._id': release._id
        })


    /* Sorting task plannings according to date */
    if (taskPlanningDates && taskPlanningDates.length) {
        logger.debug('[task-shift-future]: found [' + taskPlanningDates.length + '] task plannings for selected employee selection', {taskPlanningDates})

        taskPlanningDates.sort(function (a, b) {
            a = new Date(a)
            b = new Date(b)
            return a < b ? -1 : a > b ? 1 : 0
        })

        /* Adding 10 days to last planning date found for this employee as any tasks planned in holiday would occupy extra days so handling that as well here */
        let toTz = U.momentInUTC(taskPlanningDates[taskPlanningDates.length - 1]).add(10 + daysToShiftNumber, 'days')
        logger.debug('[task-shift-future]: toTz [' + toTz.toDate() + '] ')

        /* Getting data of all days, working days, and work on holidays */
        let daysDetails = await getWorkingDaysAndHolidays(baseDateMomentInUtc.format(SC.DATE_FORMAT), toTz.format(SC.DATE_FORMAT), taskPlanningDates)

        /* counter to count task planned in holidays */
        let taskOnHolidayCount = 0

        /** As we now have all planning dates, business days list and task on holidays we can start logic to calculate new dates against all planning dates*/

        /*
         *  - Iterate on all planning dates
         *  - See if planning date is part of work day list or holiday list
         *  - Update tasks accordingly
         *
         */


        // Following code would create an array that would hold information of existing date and new shift date
        let shiftingData = []
        if (daysDetails.taskPlanningDates && daysDetails.taskPlanningDates.length) {
            daysDetails.taskPlanningDates.map(async (planningDate) => {
                let planningDateMoment = U.momentInUTC(planningDate)
                /* calculating index of working day list where planning date and working date is same */
                let index = daysDetails.AllWorkingDayList && daysDetails.AllWorkingDayList.length ? daysDetails.AllWorkingDayList.findIndex(wd => wd.isSame(planningDateMoment)) : -1
                if (index != -1) {
                    // Task is planned on business day
                    logger.debug('[task-shift-future]: planning date [' + planningDate + '] is part of busiess day')
                    let newShiftingDate = daysDetails.AllWorkingDayList[index + taskOnHolidayCount + daysToShiftNumber]
                    shiftingData.push({
                        existingDate: planningDateMoment,
                        shiftingDate: newShiftingDate
                    })
                    logger.debug('[task-shift-future]: new shifting date for planning date [' + planningDate + '] is [' + U.formatDateInUTC(newShiftingDate) + ']')
                } else if (daysDetails.AllTasksOnHolidayList && daysDetails.AllTasksOnHolidayList.length && daysDetails.AllTasksOnHolidayList.findIndex(wd => wd.date.isSame(moment(planningDateMoment))) != -1) {
                    /* Task was planned on holidays */
                    logger.debug('[task-shift-future]: planning date [' + planningDate + '] is part of holiday day')
                    index = daysDetails.AllTasksOnHolidayList.findIndex(wd => wd.date.isSame(planningDateMoment))
                    logger.debug('[task-shift-future]: index is [' + index + '] is index.index is [' + daysDetails.AllTasksOnHolidayList[index].index + ']')
                    /* new Shifting date where task has to be placed */
                    let newShiftingDateMoment = daysDetails.AllWorkingDayList[taskOnHolidayCount + daysDetails.AllTasksOnHolidayList[index].index + daysToShiftNumber]
                    logger.debug('[task-shift-future]: new shifting date for planning date [' + planningDate + '] is [' + U.formatDateInUTC(newShiftingDateMoment) + ']')

                    shiftingData.push({
                        existingDate: planningDateMoment,
                        shiftingDate: newShiftingDateMoment
                    })
                    taskOnHolidayCount++
                    /* updating Task planning to proper date */

                } else {
                    /* System inconsistency */
                    logger.debug('[task-shift-future]: planning date [' + planningDate + '] is not found in working days or holidays')
                    throw new AppError('System inconsistency planning is neither on working days nor holidays ', EC.NOT_FOUND, EC.HTTP_BAD_REQUEST)
                }
            })
        }

        logger.debug('shifting data is ', {shiftingData})

        /**
         * We now have existing/shifting date, we would now iterate through every date and then execute updates for one date at a time,
         * would also update employee days and add any warning generate due to this movement
         */

        if (shiftingData.length) {
            let ShiftingPromises = shiftingData.map(data => {
                /* task planning of selected employee will shift */
                return MDL.TaskPlanningModel.update({
                        'release._id': release._id,
                        'planningDate': data.existingDate.toDate(),
                        'employee._id': mongoose.Types.ObjectId(employee._id),
                        'isShifted': false
                    },
                    {
                        $set: {
                            'planningDate': data.shiftingDate.toDate(),
                            'planningDateString': U.formatDateInUTC(data.shiftingDate),
                            'isShifted': true
                        }
                    }, {multi: true}
                ).exec()
            })


            return await Promise.all(ShiftingPromises).then(async promise => {
                // Tasks are now updated with new dates, what we will do now is calculate new employee days hours for each
                // shifted date/existing date. As dates can overlap between existing/shifting we have to remove duplicate
                let momentsToProcess = []
                shiftingData.forEach(data => {
                    if (momentsToProcess.findIndex(moments => data.existingDate.isSame(moments)) === -1)
                        momentsToProcess.push(data.existingDate)
                    if (momentsToProcess.findIndex(moments => data.shiftingDate.isSame(moments)) === -1)
                        momentsToProcess.push(data.shiftingDate)
                })

                // now that we have unique dates to process we would start calculating employee days
                logger.debug('[task-shift-future] dates to process ', {datesToProcess: momentsToProcess})

                MDL.TaskPlanningModel.update({'release._id': release._id}, {$set: {'isShifted': false}}, {multi: true}).exec()

                let employeeDaysPromises = momentsToProcess.map(moments => {
                    return MDL.TaskPlanningModel.aggregate([{
                        $match: {planningDate: moments.toDate(), 'employee._id': employee._id}
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
                            _id: null, // Grouping all records
                            plannedHours: {$sum: '$planning.plannedHours'}
                        }
                    }]).exec().then(result => {
                        logger.info('grouping of planned hours result for date  [' + U.formatDateInUTC(moments) + '] is ', {result})
                        if (result.length) {
                            let updates = result[0]
                            return MDL.EmployeeDaysModel.findOne({
                                date: moments.toDate(),
                                'employee._id': employee._id
                            }).exec().then(ed => {
                                if (!ed) {
                                    //no employee days found for this date create one
                                    let employeeDays = new MDL.EmployeeDaysModel()
                                    employeeDays.date = moments.toDate()
                                    employeeDays.dateString = U.formatDateInUTC(moments)
                                    employeeDays.employee = employee
                                    employeeDays.employee.name = employee.firstName
                                    employeeDays.plannedHours = updates.plannedHours
                                    return employeeDays.save()

                                } else {
                                    logger.debug('Employee days found for [' + U.formatDateInUTC(moments) + ',' + employee._id + '], updating... employee days ', {ed})
                                    ed.plannedHours = updates.plannedHours
                                    return ed.save()
                                }
                            })
                        } else {
                            // no planned hours remaining for this date so remove that entry
                            logger.debug('No planning day left for [' + U.formatDateInUTC(moments) + ',' + employee._id + '], removing... employee days')
                            return MDL.EmployeeDaysModel.remove({
                                date: moments.toDate(),
                                'employee._id': employee._id
                            }).then(() => {
                                return {
                                    employee: employee,
                                    date: moments.toDate(),
                                    plannedHours: 0 // adding planned hours as 0 would ensure deletion of too many hours warning
                                }
                            })
                        }
                    })
                })

                let employeeDaysArray = await Promise.all(employeeDaysPromises)
                logger.debug('[task-shift-future] employee days ', {employeeDaysArray})

                if (employeeDaysArray && employeeDaysArray.length) {
                    let warningPromises = employeeDaysArray.map(ed => {
                        return MDL.WarningModel.taskPlanMoved(release, ed).then((warningResponse) => {
                            logger.debug('warning update on shift to future completed successfully : [warningResponse]', {warningResponse})
                            return warningResponse
                        })
                    })

                    let allGeneratedWarnings = await Promise.all(warningPromises)

                    logger.debug('all warning task shift [allGeneratedWarnings]:=> ', {allGeneratedWarnings})

                    let taskPlanShiftWarningRemoved = []
                    let taskPlanShiftWarningAdded = []

                    allGeneratedWarnings.forEach(w => {
                        if (w.added && w.added.length)
                            taskPlanShiftWarningAdded.push(...w.added)

                        if (w.removed && w.removed.length)
                            taskPlanShiftWarningRemoved.push(...w.removed)

                    })

                    let affectedObject = await updateFlagsOnShift({
                        added: taskPlanShiftWarningAdded,
                        removed: taskPlanShiftWarningRemoved
                    })

                    return {
                        taskPlan: planning,
                        warnings: {
                            added: taskPlanShiftWarningAdded,
                            removed: taskPlanShiftWarningRemoved
                        },
                        releasePlans: affectedObject.affectedReleasePlans,
                        taskPlans: affectedObject.affectedTaskPlans
                    }
                } else {
                    return {
                        taskPlan: planning,
                        warnings: {
                            added: [],
                            removed: []
                        },
                        releasePlans: [],
                        taskPlans: []

                    }
                }
            })
        }
    } else {
        logger.debug('[task-shift-future]: no tasks found')
        throw new AppError('No task available to shift', EC.NOT_FOUND, EC.HTTP_BAD_REQUEST)
    }
}


/**
 * Shifting task plans to past
 */
taskPlanningSchema.statics.planningShiftToPast = async (planning, user, schemaRequested) => {
    if (schemaRequested)
        return V.generateSchema(V.releaseTaskPlanningShiftStruct)
    V.validate(planning, V.releaseTaskPlanningShiftStruct)
    /* Days to shift conversion in number */
    let daysToShiftNumber = Number(planning.daysToShift)
    /* employeeId must be present or its value must be all */
    let employee = await MDL.UserModel.findById(mongoose.Types.ObjectId(planning.employeeId))
    if (!employee)
        throw new AppError('Not a valid user', EC.ACCESS_DENIED, EC.HTTP_BAD_REQUEST)

    /* can not shift task whose planning date is before now */

    let nowMomentInUtc = U.getNowMomentInUtc()
    /* Base Date in UTC */
    let baseDateMomentInUtc = U.momentInUTC(planning.baseDate)
    if (baseDateMomentInUtc.isBefore(nowMomentInUtc)) {
        throw new AppError('Can not shift previous tasks', EC.ACCESS_DENIED, EC.HTTP_BAD_REQUEST)
    }

    /* checking ReleasePlan is valid or not */
    let releasePlan = await MDL.ReleasePlanModel.findById(mongoose.Types.ObjectId(planning.releasePlanID))
    if (!releasePlan)
        throw new AppError('Not a valid release plan', EC.ACCESS_DENIED, EC.HTTP_BAD_REQUEST)

    /* checking Release is valid or not */
    let release = await MDL.ReleaseModel.findById(mongoose.Types.ObjectId(releasePlan.release._id))
    if (!release)
        throw new AppError('Not a valid release', EC.ACCESS_DENIED, EC.HTTP_BAD_REQUEST)


    /* checking user role in this release */
    let userRolesInThisRelease = await MDL.ReleaseModel.getUserRolesInThisRelease(release._id, user)

    if (!U.includeAny([SC.ROLE_LEADER, SC.ROLE_MANAGER], userRolesInThisRelease)) {
        throw new AppError('Only user with role [' + SC.ROLE_MANAGER + ' or ' + SC.ROLE_LEADER + '] can shift', EC.ACCESS_DENIED, EC.HTTP_FORBIDDEN)
    }

    /* Fetch all task plannings on/after base date for this release against this employee id  */
    /* Get selected employee`s task plannings for this release, task plans of other releases would not be impacted */
    let taskPlanningDates = await MDL.TaskPlanningModel.distinct(
        'planningDateString',
        {
            'employee._id': employee._id,
            'planningDate': {$gte: baseDateMomentInUtc},
            'release._id': release._id
        })

    /* task plan sorting */
    if (taskPlanningDates && taskPlanningDates.length) {
        taskPlanningDates.sort(function (a, b) {
            a = new Date(a)
            b = new Date(b)
            return a < b ? -1 : a > b ? 1 : 0
        })

        let startShiftingDateMoment = U.momentInUTC(taskPlanningDates[0])
        let startShiftingMoment = startShiftingDateMoment.subtract(daysToShiftNumber, 'days')

        /* Can not shift task plannings before now */
        if (startShiftingMoment.isBefore(nowMomentInUtc)) {
            throw new AppError("This takes few tasks beyond today's date ", EC.BEYOND_TODAY, EC.HTTP_BAD_REQUEST)
        }

        // Since tasks planned on holidays would shift to working days and those holidays would not be considered during shifting
        // to ensure that we shift picked task to correct date it is important to check if enough days are available


        /*
        let previousDaysDetails = await getWorkingDaysAndHolidays(moment(taskPlanningDates[taskPlanningDates.length - 1]).subtract(10 * daysToShiftNumber, 'days'), momentTZ.tz(taskPlanningDates[0], SC.DATE_FORMAT, SC.UTC_TIMEZONE).hour(0).minute(0).second(0).millisecond(0))
        let idx = previousDaysDetails.AllWorkingDayList.findIndex(wd => wd.isSame(baseDateMomentInUtc))
        let idx2 = previousDaysDetails.AllTasksOnHolidayList.findIndex(wd => wd.isSame(baseDateMomentInUtc))
        if (idx != -1 && idx > daysToShiftNumber && previousDaysDetails.AllWorkingDayList[Number(idx - daysToShiftNumber)].isBefore(nowMomentInUtc)) {
            throw new AppError('Can not shift because less working days available for task shifting ', EC.NOT_FOUND, EC.HTTP_BAD_REQUEST)
        } else if (idx2 != -1 && previousDaysDetails.AllWorkingDayList[Number(Number(previousDaysDetails.AllTasksOnHolidayList[idx2].index) - daysToShiftNumber)].isBefore(nowMomentInUtc)) {
            throw new AppError('Can not shift because less working days available for task shifting and In holiday also tasks are planned', EC.NOT_FOUND, EC.HTTP_BAD_REQUEST)
        } else {

            if (idx != -1) {
                startShiftingMoment = previousDaysDetails.AllWorkingDayList[Number(idx - daysToShiftNumber)]
            } else if (idx2 != -1) {
                startShiftingMoment = previousDaysDetails.AllWorkingDayList[Number(Number(previousDaysDetails.AllTasksOnHolidayList[idx2].index) - daysToShiftNumber)]
            }
        }
        */

        // Since tasks planned on holidays would shift to working days and those holidays would not be considered during shifting
        // it is possible that even though we are shifting in past some of the last tasks may even shift to future
        // so adding 10 days to last date for increasing range
        // we would also start with current date so that we don't run short of days to shift in past

        let from = U.nowMomentInTimeZone(SC.INDIAN_TIMEZONE)
        let to = U.momentInUTC(taskPlanningDates[taskPlanningDates.length - 1]).add(10, 'days')

        let daysDetails = await getWorkingDaysAndHolidays(from.toDate(), to.toDate(), taskPlanningDates)

        logger.info("days details ", {daysDetails})

        let taskOnHolidayCount = 0

        /** As we now have all planning dates, business days list and task on holidays we can start logic
         * to calculate new dates against all planning dates
         **/

        /*
         *  - Iterate on all planning dates
         *  - See if planning date is part of work day list or holiday list
         *  - Update tasks accordingly
         *
         */

        // Following code would create an array that would hold information of existing date and new shift date
        let shiftingData = []
        if (daysDetails.taskPlanningDates && daysDetails.taskPlanningDates.length) {
            daysDetails.taskPlanningDates.map(async (planningDate) => {
                let planningDateMoment = U.momentInUTC(planningDate)
                /* calculating index of working day list where planning date and working date is same */
                let index = daysDetails.AllWorkingDayList && daysDetails.AllWorkingDayList.length ? daysDetails.AllWorkingDayList.findIndex(wd => wd.isSame(planningDateMoment)) : -1
                if (index !== -1) {
                    /* Task is planned on a business day */
                    logger.debug('[task-shift-past]: planning date [' + planningDate + '] is part of business day')
                    let workingDayIndex = index + taskOnHolidayCount - daysToShiftNumber
                    logger.debug('[task-shift-past]: Working day index [' + workingDayIndex + "]")

                    if (workingDayIndex < 0)
                        throw new AppError("This takes few tasks beyond today's date", EC.BEYOND_TODAY, EC.HTTP_BAD_REQUEST)

                    let newShiftingDate = daysDetails.AllWorkingDayList[workingDayIndex]
                    shiftingData.push({
                        existingDate: planningDateMoment,
                        shiftingDate: newShiftingDate
                    })
                    logger.debug('[task-shift-past]: new shifting date for planning date [' + planningDate + '] is [' + U.formatDateInUTC(newShiftingDate) + ']')
                } else if (daysDetails.AllTasksOnHolidayList && daysDetails.AllTasksOnHolidayList.length && daysDetails.AllTasksOnHolidayList.findIndex(wd => wd.date.isSame(moment(planningDateMoment))) != -1) {
                    /* Task was planned on a holiday */
                    logger.debug('[task-shift-past]: planning date [' + planningDate + '] is part of holiday day')
                    index = daysDetails.AllTasksOnHolidayList.findIndex(wd => wd.date.isSame(planningDateMoment))
                    logger.debug('[task-shift-past]: index is [' + index + '] is index.index is [' + daysDetails.AllTasksOnHolidayList[index].index + ']')
                    /* new Shifting date where task has to be placed */
                    logger.debug('[task-shift-past]: All working index new shifting [' + (taskOnHolidayCount + daysDetails.AllTasksOnHolidayList[index].index - daysToShiftNumber) + "]")
                    let newShiftingDateMoment = daysDetails.AllWorkingDayList[taskOnHolidayCount + daysDetails.AllTasksOnHolidayList[index].index - daysToShiftNumber]
                    logger.debug('[task-shift-past]: new shifting date for planning date [' + planningDate + '] is [' + U.formatDateInUTC(newShiftingDateMoment) + ']')

                    shiftingData.push({
                        existingDate: planningDateMoment,
                        shiftingDate: newShiftingDateMoment
                    })
                    taskOnHolidayCount++
                    /* updating Task planning to proper date */

                } else {
                    /* System inconsistency */
                    logger.debug('[task-shift-past]: planning date [' + planningDate + '] is not found in working days or holidays')
                    throw new AppError('System inconsistency planning is neither on working days nor holidays ', EC.NOT_FOUND, EC.HTTP_BAD_REQUEST)
                }
            })
        }

        logger.debug('shifting data is ', {shiftingData})

        if (shiftingData.length) {
            let ShiftingPromises = shiftingData.map(data => {
                /* task planning of selected employee will shift */
                return MDL.TaskPlanningModel.update({
                        'release._id': release._id,
                        'planningDate': data.existingDate.toDate(),
                        'employee._id': mongoose.Types.ObjectId(employee._id),
                        'isShifted': false
                    },
                    {
                        $set: {
                            'planningDate': data.shiftingDate.toDate(),
                            'planningDateString': U.formatDateInUTC(data.shiftingDate),
                            'isShifted': true
                        }
                    }, {multi: true}
                ).exec()
            })

            return await Promise.all(ShiftingPromises).then(async promise => {
                // Tasks are now updated with new dates, what we will do now is calculate new employee days hours for each
                // shifted date/existing date. As dates can overlap between existing/shifting we have to remove duplicate
                let momentsToProcess = []
                shiftingData.forEach(data => {
                    if (momentsToProcess.findIndex(moments => data.existingDate.isSame(moments)) === -1)
                        momentsToProcess.push(data.existingDate)
                    if (momentsToProcess.findIndex(moments => data.shiftingDate.isSame(moments)) === -1)
                        momentsToProcess.push(data.shiftingDate)
                })

                // now that we have unique dates to process we would start calculating employee days
                logger.debug('[task-shift-past] dates to process ', {datesToProcess: momentsToProcess})

                MDL.TaskPlanningModel.update({'release._id': release._id}, {$set: {'isShifted': false}}, {multi: true}).exec()

                let employeeDaysPromises = momentsToProcess.map(moments => {
                    return MDL.TaskPlanningModel.aggregate([{
                        $match: {planningDate: moments.toDate(), 'employee._id': employee._id}
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
                            _id: null, // Grouping all records
                            plannedHours: {$sum: '$planning.plannedHours'}
                        }
                    }]).exec().then(result => {
                        logger.info('grouping of planned hours result for date  [' + U.formatDateInUTC(moments) + '] is ', {result})
                        if (result.length) {
                            let updates = result[0]
                            return MDL.EmployeeDaysModel.findOne({
                                date: moments.toDate(),
                                'employee._id': employee._id
                            }).exec().then(ed => {
                                if (!ed) {
                                    //no employee days found for this date create one
                                    let employeeDays = new MDL.EmployeeDaysModel()
                                    employeeDays.date = moments.toDate()
                                    employeeDays.dateString = U.formatDateInUTC(moments)
                                    employeeDays.employee = employee
                                    employeeDays.employee.name = employee.firstName
                                    employeeDays.plannedHours = updates.plannedHours
                                    return employeeDays.save()

                                } else {
                                    logger.debug('Employee days found for [' + U.formatDateInUTC(moments) + ',' + employee._id + '], updating... employee days ', {ed})
                                    ed.plannedHours = updates.plannedHours
                                    return ed.save()
                                }
                            })
                        } else {
                            // no planned hours remaining for this date so remove that entry
                            logger.debug('No planning day left for [' + U.formatDateInUTC(moments) + ',' + employee._id + '], removing... employee days')
                            return MDL.EmployeeDaysModel.remove({
                                date: moments.toDate(),
                                'employee._id': employee._id
                            }).then(() => {
                                return {
                                    employee: employee,
                                    date: moments.toDate(),
                                    plannedHours: 0 // adding planned hours as 0 would ensure deletion of too many hours warning
                                }
                            })
                        }
                    })
                })

                let employeeDaysArray = await Promise.all(employeeDaysPromises)
                logger.debug('[task-shift-past] employee days ', {employeeDaysArray})

                if (employeeDaysArray && employeeDaysArray.length) {
                    let generatedWarningsPromises = employeeDaysArray.map(ed => {
                        return MDL.WarningModel.taskPlanMoved(release, ed).then((generatedWarning) => {
                            logger.debug('warning update on shift to past completed successfully')
                            return generatedWarning
                        }).catch((error) => {
                            console.log(error) // for appropriate line numbers
                            logger.error('warning update on shift to past failed ')
                            return {
                                added: [],
                                removed: []
                            }
                        })
                    })

                    let allGeneratedWarningsPromises = await Promise.all(generatedWarningsPromises)

                    logger.debug('all warning task shift allGeneratedWarningsPromises', {allGeneratedWarningsPromises})

                    let taskPlanShiftWarningAdded = []
                    let taskPlanShiftWarningRemoved = []

                    allGeneratedWarningsPromises.forEach(w => {
                        if (w.added && w.added.length)
                            taskPlanShiftWarningAdded.push(...w.added)

                        if (w.removed && w.removed.length)
                            taskPlanShiftWarningRemoved.push(...w.removed)

                    })
                    let affectedObject = await updateFlagsOnShift({
                        added: taskPlanShiftWarningAdded,
                        removed: taskPlanShiftWarningRemoved
                    })
                    return {
                        taskPlan: planning,
                        warnings: {
                            added: taskPlanShiftWarningAdded,
                            removed: taskPlanShiftWarningRemoved
                        },
                        releasePlans: affectedObject.affectedReleasePlans,
                        taskPlans: affectedObject.affectedTaskPlans

                    }
                } else {
                    return {
                        taskPlan: planning,
                        warnings: {
                            added: [],
                            removed: []
                        },
                        releasePlans: [],
                        taskPlans: []

                    }
                }
            })
        }
    } else {
        throw new AppError('No task available to shift', EC.NOT_FOUND, EC.HTTP_BAD_REQUEST)
    }
    return planning
}

const updateEmployeeDaysTaskShift = async (startDateString, endDateString, user) => {

    logger.debug('[task-shift] updateEmployeeDaysTaskShift() startDateString [' + startDateString + '] endDateString [' + endDateString + ']')

    let startDateToString = moment(startDateString).format(SC.DATE_FORMAT)
    let endDateToString = moment(endDateString).format(SC.DATE_FORMAT)
    let startDateMomentTz = momentTZ.tz(startDateToString, SC.DATE_FORMAT, SC.UTC_TIMEZONE).hour(0).minute(0).second(0).millisecond(0)
    let endDateMomentTz = momentTZ.tz(endDateToString, SC.DATE_FORMAT, SC.UTC_TIMEZONE).hour(0).minute(0).second(0).millisecond(0)

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

    /* Employee task planning details will be deleted */
    let deleteEmployeeDetails = await MDL.EmployeeDaysModel.remove({
        'date': {$gte: startDateMomentTz.clone().toDate(), $lte: startDateMomentTz.clone().toDate()}
    })
    let saveEmployeePromises = taskPlannings && taskPlannings.length ? taskPlannings.map(async tp => {

        let employeeDaysInput = {
            employee: {
                _id: tp.employee._id.toString(),
                name: tp.employee.name
            },
            dateString: moment(tp.planningDate).format(SC.DATE_FORMAT),
            plannedHours: Number(tp.plannedHours)
        }
        return await MDL.EmployeeDaysModel.addEmployeeDaysDetails(employeeDaysInput, user)
    }) : new Promise((resolve, reject) => {
        return resolve(false)
    })
    return await Promise.all(saveEmployeePromises)

}


/*----------------------------------------------------------------------REPORTING_SECTION_START----------------------------------------------------------------------*/

const addTaskReportPlannedUpdateEmployeeRelease = async (release, employee, extra) => {

    const {reportedHoursToIncrement} = extra

    let employeeRelease = await MDL.EmployeeReleasesModel.findOne({
        'employee._id': mongoose.Types.ObjectId(employee._id),
        'release._id': mongoose.Types.ObjectId(release._id)
    })

    if (!employeeRelease)
        throw new AppError("We should have found employee release ", EC.DATA_INCONSISTENT, EC.HTTP_SERVER_ERROR)

    employeeRelease.reportedHours += reportedHoursToIncrement

    return employeeRelease
}

const addTaskReportPlannedUpdateReleasePlan = async (taskPlan, releasePlan, extra) => {

    const {reportInput, reportedHoursToIncrement, reportedMoment, reReport, employeeReportIdx, maxReportedMoment, employee} = extra

    // COMMON SUMMARY DATA UPDATES

    let finalStatusChanged = false
    releasePlan.report.reportedHours += reportedHoursToIncrement

    if (!reReport) {
        // Increment task counts that are reported
        releasePlan.report.reportedTaskCounts += 1
        releasePlan.report.plannedHoursReportedTasks += taskPlan.planning.plannedHours

        if (!releasePlan.report || !releasePlan.report.minReportedDate || reportedMoment.isBefore(releasePlan.report.minReportedDate)) {
            releasePlan.report.minReportedDate = reportedMoment.toDate()
        }

        if (!releasePlan.report || !releasePlan.report.maxReportedDate || reportedMoment.isAfter(releasePlan.report.maxReportedDate)) {
            releasePlan.report.maxReportedDate = reportedMoment.toDate()
        }
    }

    let progress = getNewProgressPercentage(releasePlan, reportInput.status)
    releasePlan.diffProgress = progress - releasePlan.report.progress
    releasePlan.report.progress = progress

    logger.info('addTaskReport(): [progress] new progress is ', {progress})
    logger.info('addTaskReport(): [progress] new diff progress is ', {progress: releasePlan.diffProgress})

    // EMPLOYEE SPECIFIC SUMMARY DATA UPDATES
    if (employeeReportIdx == -1) {
        // Employee has never reported task for this release plan so add entries
        releasePlan.report.employees.push({
            _id: employee._id,
            reportedHours: reportInput.reportedHours,
            minReportedDate: reportedMoment.toDate(),
            maxReportedDate: reportedMoment.toDate(),
            reportedTaskCounts: 1,
            finalStatus: reportInput.status,
            plannedHoursReportedTasks: taskPlan.planning.plannedHours
        })
        finalStatusChanged = true
    } else {
        // The reported status would become final status of employee reporting, if reported date is same or greater than max reported date
        if (!maxReportedMoment || (maxReportedMoment.isSame(reportedMoment) || maxReportedMoment.isBefore(reportedMoment))) {
            releasePlan.report.employees[employeeReportIdx].finalStatus = reportInput.status
            finalStatusChanged = true
        }

        if (!reReport) {
            releasePlan.report.employees[employeeReportIdx].reportedHours += reportInput.reportedHours
            releasePlan.report.employees[employeeReportIdx].reportedTaskCounts += 1
            releasePlan.report.employees[employeeReportIdx].plannedHoursReportedTasks += taskPlan.planning.plannedHours

            if (reportedMoment.isBefore(releasePlan.report.employees[employeeReportIdx].minReportedDate)) {
                releasePlan.report.employees[employeeReportIdx].minReportedDate = reportedMoment.toDate()
            }

            if (reportedMoment.isAfter(releasePlan.report.employees[employeeReportIdx].maxReportedDate)) {
                releasePlan.report.employees[employeeReportIdx].maxReportedDate = reportedMoment.toDate()
            }
        }
    }

    // FINAL STATUS OF RELEASE PLAN HANDLING
    if (finalStatusChanged) {
        if (reportInput.status === SC.REPORT_PENDING) {
            // since final reported status is 'pending' by this employee this would make final status of whole release plan as pending

            logger.debug('As employeed reported task as pending final status of release plan would be pending as well ')
            releasePlan.report.finalStatus = SC.REPORT_PENDING
        } else if (reportInput.status === SC.REPORT_COMPLETED) {
            logger.debug('Employee has reported task as completed, we would now check if this makes release plan as completed')

            /* this means that employee has reported its part as completed we would have to check final statuses of all other employee involved in this
               release plan to see if there final status is completed as well
             */
            // check statuses of other employees to see if they are completed as well

            let taskPlanCompleted = true
            // here we are iterating on all the employees that are part of planning and see if all have reported their tasks as completed
            releasePlan.planning.employees.forEach(e => {
                let employeeOfReport = releasePlan.report.employees.find(er => er._id.toString() === e._id.toString())
                if (!employeeOfReport) {
                    logger.debug('Employee [' + e._id + '] has not reported so far so release plan final status would be pending')
                    // this means that employee has not reported till now so we will consider release plan as pending
                    taskPlanCompleted = false
                } else if (employeeOfReport.finalStatus === SC.STATUS_PENDING) {
                    logger.debug('Employee [' + e._id + '] has reported final status as pending so release plan final status would be pending')
                    taskPlanCompleted = false
                }
            })

            if (taskPlanCompleted) {
                logger.debug('Release plan status would now be marked as completed')
                releasePlan.report.finalStatus = SC.STATUS_COMPLETED
            } else {
                logger.debug('Release plan status would now be marked as pending')
                releasePlan.report.finalStatus = SC.REPORT_PENDING
            }
        }
    }

    return releasePlan
}

const addTaskReportPlannedUpdateRelease = async (taskPlan, releasePlan, release, extra) => {

    const {reportInput, reportedHoursToIncrement, reReport, reportedMoment} = extra

    let iterationIndex = releasePlan.release.iteration.idx


    logger.debug("addTaskReportPlannedUpdateRelease(): releaseplan.diffProgress " + releasePlan.diffProgress)
    release.iterations[iterationIndex].reportedHours += reportedHoursToIncrement
    if (!reReport) {
        logger.debug("addTaskReportPlannedUpdateRelease(): this is a rereport ")
        // Add planned hours of reported task to release if it is first time reporting
        release.iterations[iterationIndex].plannedHoursReportedTasks += taskPlan.planning.plannedHours
    }

    let partInRelease = releasePlan.task.estimatedHours / release.iterations[iterationIndex].estimatedHours
    logger.debug("addTaskReportPlannedUpdateRelease(): part in release " + partInRelease)
    if (releasePlan.diffProgress)
        release.iterations[iterationIndex].progress += releasePlan.diffProgress * partInRelease
    release.iterations[iterationIndex].progress = release.iterations[iterationIndex].progress.toFixed(2)

    if (!release.iterations[iterationIndex].maxReportedDate || (release.iterations[iterationIndex].maxReportedDate && reportedMoment.isAfter(release.iterations[iterationIndex].maxReportedDate))) {
        /* if reported date is greater than earlier max reported date change that */
        release.iterations[iterationIndex].maxReportedDate = reportedMoment.toDate()
    }

    if (reportInput.status == SC.REPORT_COMPLETED && (!taskPlan.report || taskPlan.report.status != SC.REPORT_COMPLETED)) {
        /* Task was reported as complete and it was not reported as complete earlier then we can add to estimatedHoursCompletedTasks */
        release.iterations[iterationIndex].estimatedHoursCompletedTasks += releasePlan.task.estimatedHours
    } else if (taskPlan.report && taskPlan.report.status == SC.REPORT_COMPLETED && reportInput.status == SC.REPORT_PENDING) {
        /* When completed status is changed to pending we have to decrement estimated hours from overall statistics */
        release.iterations[iterationIndex].estimatedHoursCompletedTasks -= releasePlan.task.estimatedHours
    }

    return release
}


const addTaskReportPlannedUpdateTaskPlan = async (taskPlan, releasePlan, release, extra) => {

    const {reportInput, reReport} = extra

    if (!taskPlan.report)
        taskPlan.report = {}

    taskPlan.report.status = reportInput.status

    if (!reReport)
    /* only change reported on date if it is first report*/
        taskPlan.report.reportedOnDate = new Date()

    if (reportInput.reason)
        taskPlan.report.reasons = [reportInput.reason]

    taskPlan.report.reportedHours = reportInput.reportedHours
    return taskPlan
}

const addTaskReportPlanned = async (reportInput, employee) => {
    /* Get task plan */
    let taskPlan = await MDL.TaskPlanningModel.findById(reportInput._id)

    if (!taskPlan)
        throw new AppError('Reported task not found', EC.NOT_FOUND, EC.HTTP_BAD_REQUEST)

    if (taskPlan.employee._id.toString() !== employee._id.toString())
        throw new AppError('This task is not assigned to you ', EC.ACCESS_DENIED, EC.HTTP_FORBIDDEN)

    /* find release plan associated with this task plan */

    let releasePlan = await MDL.ReleasePlanModel.findById(taskPlan.releasePlan._id)
    if (!releasePlan)
        throw new AppError('No release plan associated with this task plan, data corrupted ', EC.UNEXPECTED_ERROR, EC.HTTP_SERVER_ERROR)

    let release = await MDL.ReleaseModel.findById(releasePlan.release._id, {iterations: 1, name: 1, project: 1})

    if (!release)
        throw new AppError('Invalid release id , data corrupted ', EC.DATA_INCONSISTENT, EC.HTTP_SERVER_ERROR)

    /* See if this is a re-report if yes then check if time for re-reporting is gone */
    let reReport = false
    if (taskPlan.report && taskPlan.report.reportedOnDate) {
        reReport = true
        // this means this task was already reported by employee earlier, reporting would only be allowed till 2 hours from previous reported date
        let twoHoursFromReportedOnDate = new moment(taskPlan.report.reportedOnDate)
        twoHoursFromReportedOnDate.add(2, 'hours')
        if (twoHoursFromReportedOnDate.isBefore(new Date())) {
            throw new AppError('Cannot report after 2 hours from first reporting', EC.TIME_OVER_FOR_RE_REPORTING, EC.HTTP_BAD_REQUEST)
        }
    }


    let reportedMoment = U.momentInUTC(reportInput.reportedDate)
    let maxReportedMoment

    /**
     * Task can only be reported once all other task of this release plan added against this employee is reported
     */

    let pastTaskCount = await MDL.TaskPlanningModel.count({
        'releasePlan._id': releasePlan._id,
        'employee._id': mongoose.Types.ObjectId(employee._id),
        'planningDate': {$lt: reportedMoment.toDate()},
        'report.status': SC.REPORT_UNREPORTED
    })

    logger.debug("addTaskReportPlanned(): Past task count is ", {pastTaskCount})

    if (pastTaskCount > 0)
        throw new AppError('Cannot report as this there are unreported entries of this Task in past dates', EC.HAS_UNREPORTED_TASKS, EC.HTTP_BAD_REQUEST)

    // Find out existing employee report data for this release plan
    let employeeReportIdx = -1
    if (releasePlan.report.employees) {
        employeeReportIdx = releasePlan.report.employees.findIndex(e => {
            return e._id.toString() === employee._id.toString()
        })
    }

    // Find this employee planning index
    let employeePlanningIdx = releasePlan.planning.employees.findIndex(e => {
        return e._id.toString() === employee._id.toString()
    })

    if (employeePlanningIdx == -1) {
        throw new AppError('Employee index in planning.employees should have been found for reported task.', EC.DATA_INCONSISTENT, EC.HTTP_SERVER_ERROR)
    }


    if (employeeReportIdx != -1) {
        /**
         * User has reported tasks of this release plan earlier as well, validate status using following rules, employee cannot report status as
         * 'pending' or 'completed' , if task was already reported as 'completed' in past
         * 'completed' if task was already reported as 'pending' or 'completed' in future
         */

        if (releasePlan.report.employees[employeeReportIdx].maxReportedDate) {
            // This task was reported earlier as well, we have to hence validate if reported status is allowed or not
            maxReportedMoment = moment(releasePlan.report.employees[employeeReportIdx].maxReportedDate)
            // See if task was reported in future if so only possible status is pending
            if (reportedMoment.isBefore(maxReportedMoment) && (reportInput.status !== SC.REPORT_PENDING)) {
                throw new AppError('Task was reported in future, only allowed status is [' + SC.REPORT_PENDING + ']', EC.REPORT_STATUS_NOT_ALLOWED, EC.HTTP_BAD_REQUEST)
            } else if (reportedMoment.isAfter(maxReportedMoment) && releasePlan.report.employees[employeeReportIdx].finalStatus === SC.REPORT_COMPLETED)
                throw new AppError('Task was reported as [' + SC.REPORT_COMPLETED + '] in past, hence report can no longer be added in future')
        }
    }

    /* In case this is re-reporting this diff reported hours would help in adjusting statistics */
    let reportedHoursToIncrement = 0

    if (reReport) {
        reportedHoursToIncrement = reportInput.reportedHours - taskPlan.report.reportedHours
    } else {
        reportedHoursToIncrement = reportInput.reportedHours
    }

    /******************************** RELEASE PLAN UPDATES **************************************************/
    releasePlan = await addTaskReportPlannedUpdateReleasePlan(taskPlan, releasePlan, {
        reportInput,
        reportedHoursToIncrement,
        reportedMoment,
        reReport,
        employeeReportIdx,
        maxReportedMoment,
        employee
    })


    /************************************** RELEASE UPDATES  ***************************************/
    release = await addTaskReportPlannedUpdateRelease(taskPlan, releasePlan, release, {
        reportInput,
        reportedHoursToIncrement,
        reReport,
        reportedMoment
    })

    /*************************** TASK PLAN UPDATES ***********************************/
    taskPlan = await addTaskReportPlannedUpdateTaskPlan(taskPlan, releasePlan, release, {
        reportInput,
        reReport
    })

    let employeeRelease = await addTaskReportPlannedUpdateEmployeeRelease(release, employee, {
        reportedHoursToIncrement
    })

    // Need to add/update reporting warnings.

    let warningsTaskReported = await  MDL.WarningModel.taskReported(taskPlan, releasePlan, release, {
        reportedMoment,
        employeePlanningIdx,
        reportInput
    })

    let {affectedTaskPlans} = await updateFlags(warningsTaskReported, releasePlan, taskPlan)

    await employeeRelease.save()
    logger.debug('release before save ', {release})
    await release.save()
    logger.debug('release plan before save ', {releasePlan})
    await releasePlan.save()
    logger.debug('task plan before save ', {taskPlan})
    taskPlan = await taskPlan.save()

    return {
        taskPlan,
        affectedTaskPlans,
        warnings: warningsTaskReported
    }
}

const addTaskReportUnplannedUpdateReleasePlan = async (taskPlan, releasePlan, extra) => {

    const {reportInput, reportedHoursToIncrement, reportedMoment, reReport, employeeReportIdx, employee} = extra

    // COMMON SUMMARY DATA UPDATES

    logger.debug("addTaskReportUnplannedUpdateReleasePlan(): Reported Hours to increment is ", {reportedHoursToIncrement})

    releasePlan.report.reportedHours += reportedHoursToIncrement

    if (!reReport) {
        // Increment task counts that are reported
        releasePlan.report.reportedTaskCounts += 1

        if (!releasePlan.report || !releasePlan.report.minReportedDate || reportedMoment.isBefore(releasePlan.report.minReportedDate)) {
            releasePlan.report.minReportedDate = reportedMoment.toDate()
        }

        if (!releasePlan.report || !releasePlan.report.maxReportedDate || reportedMoment.isAfter(releasePlan.report.maxReportedDate)) {
            releasePlan.report.maxReportedDate = reportedMoment.toDate()
        }
    }

    // EMPLOYEE SPECIFIC SUMMARY DATA UPDATES
    if (employeeReportIdx == -1) {
        // Employee has never reported task for this release plan so add entries
        releasePlan.report.employees.push({
            _id: employee._id,
            reportedHours: reportInput.reportedHours,
            minReportedDate: reportedMoment.toDate(),
            maxReportedDate: reportedMoment.toDate(),
            reportedTaskCounts: 1,
            finalStatus: reportInput.status
        })
    } else {
        if (!reReport) {
            releasePlan.report.employees[employeeReportIdx].reportedHours += reportInput.reportedHours
            releasePlan.report.employees[employeeReportIdx].reportedTaskCounts += 1
            if (reportedMoment.isBefore(releasePlan.report.employees[employeeReportIdx].minReportedDate)) {
                releasePlan.report.employees[employeeReportIdx].minReportedDate = reportedMoment.toDate()
            }

            if (reportedMoment.isAfter(releasePlan.report.employees[employeeReportIdx].maxReportedDate)) {
                releasePlan.report.employees[employeeReportIdx].maxReportedDate = reportedMoment.toDate()
            }
        } else {
            releasePlan.report.employees[employeeReportIdx].reportedHours += reportedHoursToIncrement
        }
    }

    // 'unplanned'
    releasePlan.report.finalStatus = SC.REPORT_PENDING
    return releasePlan
}

const addTaskReportUnplannedUpdateRelease = async (taskPlan, releasePlan, release, extra) => {

    const {reportedHoursToIncrement, reportedMoment} = extra
    let iterationIndex = releasePlan.release.iteration.idx
    release.iterations[iterationIndex].reportedHours += reportedHoursToIncrement

    if (!release.iterations[iterationIndex].maxReportedDate || (release.iterations[iterationIndex].maxReportedDate && reportedMoment.isAfter(release.iterations[iterationIndex].maxReportedDate))) {
        /* if reported date is greater than earlier max reported date change that */
        release.iterations[iterationIndex].maxReportedDate = reportedMoment.toDate()
    }

    return release
}

const addTaskReportUnplanned = async (reportInput, employee) => {
    /**
     * In 'unplanned' task reporting there would not be any corresponding task plan as case with 'planned' tasks,
     * rather it would have only release plan.
     *
     * Few difference from planned task reporting
     * - Status would not be handled as it is always
     *
     */

    let reportedMoment = U.momentInUTC(reportInput.reportedDate)

    let releasePlan = await MDL.ReleasePlanModel.findById(reportInput._id)
    if (!releasePlan)
        throw new AppError('No release plan associated with this task plan, data corrupted ', EC.UNEXPECTED_ERROR, EC.HTTP_SERVER_ERROR)

    // Try to find out task plan for today's date for this release plan

    let taskPlan = await MDL.TaskPlanningModel.findOne({
        'releasePlan._id': releasePlan._id,
        'employee._id': mongoose.Types.ObjectId(employee._id),
        'planningDate': reportedMoment.toDate()
    })

    logger.debug("addTaskReportUnplanned(): taskPlan found as ", {taskPlan})

    if (!taskPlan) {
        // No task plan found against this release plan so will be creating new one
        taskPlan = new MDL.TaskPlanningModel()
        taskPlan.created = Date.now()
        taskPlan.planningDate = reportedMoment.toDate()
        taskPlan.planningDateString = reportedMoment.format(SC.DATE_FORMAT)
        taskPlan.release = releasePlan.release
        taskPlan.releasePlan = releasePlan
        taskPlan.employee = Object.assign({}, employee, {name: ((employee.firstName ? employee.firstName + ' ' : '') + (employee.lastName ? employee.lastName : ''))})
        taskPlan.description = reportInput.description ? reportInput.description : ''
        taskPlan.task = releasePlan.task
        taskPlan.iterationType = SC.ITERATION_TYPE_UNPLANNED
        taskPlan.report = {
            status: SC.REPORT_PENDING
        }
    }

    let release = await MDL.ReleaseModel.findById(releasePlan.release._id, {iterations: 1, name: 1, project: 1})

    if (!release)
        throw new AppError('Invalid release id , data corrupted ', EC.DATA_INCONSISTENT, EC.HTTP_SERVER_ERROR)

    /* See if this is a re-report if yes then check if time for re-reporting is gone */
    let reReport = false
    if (taskPlan.report && taskPlan.report.reportedOnDate) {
        reReport = true
        // this means this task was already reported by employee earlier, reporting would only be allowed till 2 hours from previous reported date
        let twoHoursFromReportedOnDate = new moment(taskPlan.report.reportedOnDate)
        twoHoursFromReportedOnDate.add(2, 'hours')
        if (twoHoursFromReportedOnDate.isBefore(new Date())) {
            throw new AppError('Cannot report after 2 hours from first reporting', EC.TIME_OVER_FOR_RE_REPORTING, EC.HTTP_BAD_REQUEST)
        }
    }

    if (!reReport)
    /* only change reported on date if it is first report*/
        taskPlan.report.reportedOnDate = new Date()


    // Find out existing employee report data for this release plan

    let employeeReportIdx = -1
    if (releasePlan.report.employees) {
        employeeReportIdx = releasePlan.report.employees.findIndex(e => {
            return e._id.toString() === employee._id.toString()
        })
    }

    /* In case this is re-reporting this diff reported hours would help in adjusting statistics */
    let reportedHoursToIncrement = 0

    if (reReport) {
        reportedHoursToIncrement = reportInput.reportedHours - taskPlan.report.reportedHours
    } else {
        reportedHoursToIncrement = reportInput.reportedHours
    }
    // as we have calculated reported hours to increment we can set new reported hours in task plan
    taskPlan.report.reportedHours = reportInput.reportedHours

    logger.debug("rereport is calculated as ", {reReport})

    /******************************** RELEASE PLAN UPDATES **************************************************/
    releasePlan = await addTaskReportUnplannedUpdateReleasePlan(taskPlan, releasePlan, {
        reportInput,
        reportedHoursToIncrement,
        reportedMoment,
        reReport,
        employeeReportIdx,
        employee
    })

    /************************************** RELEASE UPDATES  ***************************************/
    release = await addTaskReportUnplannedUpdateRelease(taskPlan, releasePlan, release, {
        reportInput,
        reportedHoursToIncrement,
        reReport,
        reportedMoment
    })

    // No warning handling would be done for unplanned release plans
    logger.debug('release before save ', {release})
    await release.save()
    logger.debug('release plan before save ', {releasePlan})
    await releasePlan.save()
    logger.debug('task plan before save ', {taskPlan})
    taskPlan = await taskPlan.save()
    return {
        taskPlan
    }
}


taskPlanningSchema.statics.addTaskReport = async (taskReport, employee) => {
    console.log("taskreport " + JSON.stringify(taskReport))
    V.validate(taskReport, V.releaseTaskReportStruct)

    if (taskReport.iterationType == SC.ITERATION_TYPE_PLANNED) {
        return await addTaskReportPlanned(taskReport, employee)
    } else if (taskReport.iterationType == SC.ITERATION_TYPE_UNPLANNED) {
        return await addTaskReportUnplanned(taskReport, employee)
    }
}


/**
 * add comments from task detail page by developer or manager or leader
 */
taskPlanningSchema.statics.addComment = async (commentInput, user, schemaRequested) => {
    if (schemaRequested)
        return V.generateSchema(V.releaseTaskPlanningCommentStruct)

    V.validate(commentInput, V.releaseTaskPlanningCommentStruct)

    let release = await MDL.ReleaseModel.findById(mongoose.Types.ObjectId(commentInput.releaseID))
    if (!release) {
        throw new AppError('Release not found', EC.NOT_FOUND, EC.HTTP_BAD_REQUEST)
    }


    /* checking user role in this release */
    let userRolesInThisRelease = await MDL.ReleaseModel.getUserRolesInThisRelease(release._id, user)

    if (!U.includeAny([SC.ROLE_LEADER, SC.ROLE_MANAGER, SC.ROLE_DEVELOPER, SC.ROLE_NON_PROJECT_DEVELOPER], userRolesInThisRelease)) {
        throw new AppError('Only user with role [' + SC.ROLE_MANAGER + ' or ' + SC.ROLE_LEADER + ' or ' + SC.ROLE_DEVELOPER + ' or ' + SC.ROLE_NON_PROJECT_DEVELOPER + '] can add comment', EC.ACCESS_DENIED, EC.HTTP_FORBIDDEN)
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

/*
GetReportTasks
 */
taskPlanningSchema.statics.getReportTasks = async (releaseID, dateString, iterationType, reportedStatus, user) => {

    console.log("iteration type is ", iterationType)

    if (iterationType == SC.ITERATION_TYPE_PLANNED) {
        // In this iteration type, user would be able to report tasks that have tasks plans planned on chosen date
        let criteria = {
            'planningDate': U.dateInUTC(dateString),
            'employee._id': mongoose.Types.ObjectId(user._id),
            'iterationType': {
                $ne: SC.ITERATION_TYPE_UNPLANNED
            }
        }

        if (releaseID && releaseID.toLowerCase() !== SC.ALL) {
            // report tasks of a specific release is requested
            criteria['release._id'] = mongoose.Types.ObjectId(releaseID)
        }

        if (reportedStatus && reportedStatus !== SC.ALL) {
            criteria['report.status'] = reportedStatus
        }
        let tasks = await MDL.TaskPlanningModel.find(criteria)
        // Group tasks by releases
        let groupedTasks = _.groupBy(tasks, (t) => t.release._id.toString())

        // iterate on each release id and find name of that release

        let promises = []

        _.forEach(groupedTasks, (value, key) => {
            promises.push(MDL.ReleaseModel.findById(mongoose.Types.ObjectId(key), {
                project: 1,
                name: 1
            }).then(release => {
                return Object.assign({}, release.toObject(), {
                    releaseName: release.project.name + " (" + release.name + ")",
                    tasks: value
                })
            }))
        })
        let releases = await Promise.all(promises)
        return releases
    } else if (iterationType == SC.ITERATION_TYPE_UNPLANNED) {
        // In this iteration type employee would be able to report all the unplanned release plan added against a release
        let criteria = {
            'release.iteration.iterationType': SC.ITERATION_TYPE_UNPLANNED
        }

        if (releaseID && releaseID.toLowerCase() !== SC.ALL) {
            // report tasks of a specific release is requested
            criteria['release._id'] = mongoose.Types.ObjectId(releaseID)
        }

        let releasePlans = await MDL.ReleasePlanModel.find(criteria)

        let releasePlanPromises = _.map(releasePlans, (rp) => {

            return MDL.TaskPlanningModel.findOne({
                'releasePlan._id': rp._id,
                'employee._id': mongoose.Types.ObjectId(user._id),
                'planningDate': U.dateInUTC(dateString)
            }).then(tp => {

                let taskPlan = {}
                taskPlan._id = rp._id
                taskPlan.release = rp.release
                taskPlan.releasePlan = {
                    _id: rp._id
                }
                taskPlan.task = rp.task
                if (tp) {
                    taskPlan.report = {
                        reportedHours: tp.report.reportedHours
                    }
                } else {
                    taskPlan.report = {
                        reportedHours: 0
                    }
                }
                return taskPlan
            })
        })

        let taskPlans = await Promise.all(releasePlanPromises)

        // Group plans by releases
        let groupedPlans = _.groupBy(taskPlans, (t) => t.release._id.toString())

        // iterate on each release id and find name of that release

        let promises = []

        _.forEach(groupedPlans, (value, key) => {
            promises.push(MDL.ReleaseModel.findById(mongoose.Types.ObjectId(key), {
                project: 1,
                name: 1
            }).then(release => {
                return Object.assign({}, release.toObject(), {
                    releaseName: release.project.name + " (" + release.name + ")",
                    tasks: value
                })
            }))
        })
        let releases = await Promise.all(promises)
        return releases
    } else {
        console.log("returning empty array")
        return {}
    }
}

taskPlanningSchema.statics.getTaskPlanDetails = async (taskPlanID, user) => {
    /* checking release is valid or not */

    if (!taskPlanID) {
        throw new AppError('task plan id not found', EC.NOT_FOUND, EC.HTTP_BAD_REQUEST)
    }

    let taskPlan = await MDL.TaskPlanningModel.findById(mongoose.Types.ObjectId(taskPlanID))

    if (!taskPlan) {
        throw new AppError('Not a valid taskPlan', EC.NOT_EXISTS, EC.HTTP_BAD_REQUEST)
    }

    let release = await MDL.ReleaseModel.findById(mongoose.Types.ObjectId(taskPlan.release._id))


    /* user Role in this release to see task detail */
    const userRolesInRelease = await MDL.ReleaseModel.getUserRolesInThisRelease(release._id, user)
    /* user assumes no role in this release */
    if (userRolesInRelease.length == 0)
        throw new AppError('Not a user of this release', EC.NOT_FOUND, EC.HTTP_BAD_REQUEST)

    /* checking task plan is valid or not */

    let releasePlan = await MDL.ReleasePlanModel.findById(mongoose.Types.ObjectId(taskPlan.releasePlan._id), {
        task: 1,
        description: 1,
        estimation: 1,
        comments: 1,
    })

    let estimationDescription = {description: ''}

    if (releasePlan && releasePlan.estimation && releasePlan.estimation._id) {
        estimationDescription = await MDL.EstimationModel.findOne({
            '_id': mongoose.Types.ObjectId(releasePlan.estimation._id),
            status: SC.STATUS_PROJECT_AWARDED
        }, {
            description: 1,
            _id: 0
        })
    }

    return {
        estimationDescription: estimationDescription.description,
        taskPlan: taskPlan,
        releasePlan: releasePlan,
        release: release
    }
}

/*----------------------------------------------------------------------REPORTING_SECTION_END------------------------------------------------------------------------*/


const TaskPlanningModel = mongoose.model('TaskPlanning', taskPlanningSchema)
export default TaskPlanningModel
/*
*
const makeWarningUpdatesShiftToFuture = async (release, employeeDays) => {


    logger.debug('[task-shift] taskPlanningModel.makeWarningUpdatesShiftToFuture(): Generated warnings [' + U.formatDateInUTC(employeeDays.date) + ']', {generatedWarnings})

    let warningPromises = []
    let tooManyHoursReleasePlanRemove = []
    let tooManyHoursReleasePlanAdd = []

    if (generatedWarnings.removed && generatedWarnings.removed.length) {
        generatedWarnings.removed.forEach(w => {
            if (w.type === SC.WARNING_TOO_MANY_HOURS) {
                if (w.warningType === SC.WARNING_TYPE_RELEASE_PLAN) {
                    // add all release plan ids into this array
                    tooManyHoursReleasePlanRemove.push(w._id.toString())

                }
                if (w.warningType === SC.WARNING_TYPE_TASK_PLAN) {
                    logger.debug('[task-shift] shiftToFuture(): warning [' + SC.WARNING_TOO_MANY_HOURS + '] is removed from task plan with id [' + w._id + ']')
                    // this warning has affected task plan other than associated with current release plan find that release plan and add flag there as well
                    warningPromises.push(MDL.TaskPlanningModel.findById(w._id).then(t => {
                        if (t && t.flags.indexOf(SC.WARNING_TOO_MANY_HOURS) > -1) {
                            logger.debug('Pulling  [' + SC.WARNING_TOO_MANY_HOURS + '] warning against task plan [' + t._id + ']')
                            t.flags.pull(SC.WARNING_TOO_MANY_HOURS)
                            return t.save()

                        }
                    }))
                }
            } else if (w.type === SC.WARNING_EMPLOYEE_ON_LEAVE) {
                // TODO - need to handle employee on leave warnings

            } else if (w.type === SC.WARNING_EMPLOYEE_ASK_FOR_LEAVE) {
                // TODO - need to handle employee ask for leave warnings
            }
        })
    }

    if (generatedWarnings.added && generatedWarnings.added.length) {
        generatedWarnings.added.forEach(w => {
            if (w.type === SC.WARNING_TOO_MANY_HOURS) {

                if (w.warningType === SC.WARNING_TYPE_RELEASE_PLAN) {
                    logger.debug('taskShiftToFuture(): [' + U.formatDateInUTC(employeeDays.date) + '] warning [' + SC.WARNING_TOO_MANY_HOURS + '] is added against release plan with id [' + w._id + ']')

                    // As release plan id is part of added list, remove it from remove list if present as even one addition would mean release plan still have that warning
                    tooManyHoursReleasePlanAdd.push(w._id.toString())
                }

                if (w.warningType === SC.WARNING_TYPE_TASK_PLAN) {
                    logger.debug('taskShiftToFuture(): warning [' + SC.WARNING_TOO_MANY_HOURS + '] is added against task plan with id [' + w._id + ']')
                    // this warning has affected task plan other than associated with current release plan find that release plan and add flag there as well
                    warningPromises.push(MDL.TaskPlanningModel.findById(w._id).then(t => {
                        if (t && t.flags.indexOf(SC.WARNING_TOO_MANY_HOURS) === -1) {
                            logger.debug('Pushing  [' + SC.WARNING_TOO_MANY_HOURS + '] warning against task plan [' + t._id + ']')
                            t.flags.push(SC.WARNING_TOO_MANY_HOURS)
                            return t.save()
                        }
                    }))
                }
            } else if (w.type === SC.WARNING_EMPLOYEE_ON_LEAVE) {
                // TODO - need to handle employee on leave warnings

            } else if (w.type === SC.WARNING_EMPLOYEE_ASK_FOR_LEAVE) {
                // TODO - need to handle employee ask for leave warnings
            }
        })
    }
    return await Promise.all(warningPromises).then(() => {
        return {
            tooManyHoursReleasePlanRemove,
            tooManyHoursReleasePlanAdd
        }
    })
}
*/

/*
                logger.debug('BEFORE FILTER ADD/REMOVE REELASE PLANS ', {tooManyHoursReleasePlanRemove})
                logger.debug('BEFORE FILTER ADD/REMOVE REELASE PLANS ', {tooManyHoursReleasePlanAdd})
                */
/*
                    logger.debug('BEFORE FILTER REMOVE ', {tooManyHoursReleasePlanRemove})
                    tooManyHoursReleasePlanRemove = tooManyHoursReleasePlanRemove.filter(rid => tooManyHoursReleasePlanAdd.indexOf(rid) == -1)
                    logger.debug('FILTERED REMOVE ', {tooManyHoursReleasePlanRemove})
                    tooManyHoursReleasePlanRemove = _.uniq(tooManyHoursReleasePlanRemove)
                    tooManyHoursReleasePlanAdd = _.uniq(tooManyHoursReleasePlanAdd)

                    logger.debug('ADD/REMOVE RELEASE PLANS ', {tooManyHoursReleasePlanRemove})
                    logger.debug('ADD/REMOVE RELEASE PLANS ', {tooManyHoursReleasePlanAdd})
*/
/*                   // now add/remove release plan flags
                   tooManyHoursReleasePlanRemove.forEach(rid => {
                       MDL.ReleasePlanModel.findById(rid).then(r => {
                           logger.debug('Pulling  [' + SC.WARNING_TOO_MANY_HOURS + '] warning against release plan [' + r._id + ']')
                           if (r && r.flags.indexOf(SC.WARNING_TOO_MANY_HOURS) > -1) {
                               r.flags.pull(SC.WARNING_TOO_MANY_HOURS)
                               return r.save().then(() => {
                                   logger.debug('release plan [' + r._id + '] has been saved')
                               }).catch(error => {
                                   logger.error('caught error ', {error})
                               })
                           }
                       })
                   })
                   tooManyHoursReleasePlanAdd.forEach(rid => {
                       MDL.ReleasePlanModel.findById(rid).then(r => {
                           if (r && r.flags.indexOf(SC.WARNING_TOO_MANY_HOURS) === -1) {
                               logger.debug('Pushing  [' + SC.WARNING_TOO_MANY_HOURS + '] warning against release plan [' + r._id + ']')
                               r.flags.push(SC.WARNING_TOO_MANY_HOURS)
                               return r.save()
                           }
                       })
                   })
*/
