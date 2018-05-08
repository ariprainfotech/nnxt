import mongoose from 'mongoose'
import AppError from '../AppError'
import * as SC from "../serverconstants";
import {userHasRole} from "../utils"
import * as EC from "../errorcodes"
import * as MDL from "../models"
import momentTZ from 'moment-timezone'
import moment from 'moment'

mongoose.Promise = global.Promise

let releaseSchema = mongoose.Schema({
    user: {
        _id: mongoose.Schema.ObjectId,
        firstName: String,
        lastName: String
    },
    name: {type: String, required: [true, 'Release Version name is required']},
    status: {
        type: String,
        enum: [SC.STATUS_PLAN_REQUESTED, SC.STATUS_DEV_IN_PROGRESS, SC.STATUS_DEV_COMPLETED, SC.STATUS_RELEASED, SC.STATUS_ISSUE_FIXING, SC.STATUS_OVER]
    },
    project: {
        _id: {type: mongoose.Schema.ObjectId, required: true},
        name: {type: String, required: [true, 'Project name is required']}
    },
    manager: {
        _id: {type: mongoose.Schema.ObjectId, required: true},
        firstName: {type: String, required: [true, 'Manager name is required']},
        lastName: String,
        email: {type: String, required: [true, 'Manager email name is required']}
    },
    leader: {
        _id: {type: mongoose.Schema.ObjectId, required: true},
        firstName: {type: String, required: [true, 'Leader name is required']},
        lastName: String,
        email: {type: String, required: [true, 'Leader email name is required']}
    },
    team: [{
        _id: {type: mongoose.Schema.ObjectId, required: true},
        name: {type: String, required: [true, 'Team name is required']},
        email: {type: String, required: [true, 'Developer email name is required']}
    }],
    initial: {
        billedHours: {type: Number, default: 0},
        estimatedHours: {type: Number, default: 0},
        plannedHours: {type: Number, default: 0},
        reportedHours: {type: Number, default: 0},
        estimatedHoursPlannedTasks: {type: Number, default: 0},
        estimatedHoursCompletedTasks: {type: Number, default: 0},
        plannedHoursReportedTasks: {type: Number, default: 0},
        devStartDate: Date,
        devEndDate: Date,
        clientReleaseDate: Date,
        actualReleaseDate: Date,
        maxReportedDate: Date
    },
    additional: {
        billedHours: {type: Number, default: 0},
        estimatedHours: {type: Number, default: 0},
        plannedHours: {type: Number, default: 0},
        reportedHours: {type: Number, default: 0},
        estimatedHoursPlannedTasks: {type: Number, default: 0},
        estimatedHoursCompletedTasks: {type: Number, default: 0},
        plannedHoursReportedTasks: {type: Number, default: 0},
        devStartDate: Date,
        devEndDate: Date,
        clientReleaseDate: Date,
        actualReleaseDate: Date,
        maxReportedDate: Date
    },
    created: {type: Date, default: Date.now()},
    updated: {type: Date, default: Date.now()}
})

releaseSchema.statics.addRelease = async (projectAwardData, user) => {
    if (!user || (!userHasRole(user, SC.ROLE_NEGOTIATOR)))
        throw new AppError('Only user with of the roles [' + SC.ROLE_NEGOTIATOR + '] can add release', EC.INVALID_USER, EC.HTTP_BAD_REQUEST)

    let releaseInput = {}
    let initial = {}
    const project = await MDL.ProjectModel.findById(projectAwardData.estimation.project._id)
    if (!project)
        throw new AppError('Project not found', EC.NOT_FOUND, EC.HTTP_BAD_REQUEST)

    const manager = await MDL.UserModel.findOne({"_id": projectAwardData.manager._id, "roles.name": SC.ROLE_MANAGER})
    if (!manager)
        throw new AppError('Project Manager not found', EC.NOT_FOUND, EC.HTTP_BAD_REQUEST)

    const leader = await MDL.UserModel.findById({"_id": projectAwardData.leader._id, "roles.name": SC.ROLE_LEADER})
    if (!leader)
        throw new AppError('Project Leader not found', EC.NOT_FOUND, EC.HTTP_BAD_REQUEST)

    const projectAlreadyAwarded = await ReleaseModel.findOne({"project._id": projectAwardData.estimation.project._id})
    if (projectAlreadyAwarded)
        throw new AppError('Project already awarded', EC.ALREADY_EXISTS, EC.HTTP_BAD_REQUEST)

    initial.billedHours = projectAwardData.billedHours
    initial.clientReleaseDate = projectAwardData.clientReleaseDate
    initial.devStartDate = projectAwardData.devStartDate
    initial.devEndDate = projectAwardData.devReleaseDate
    releaseInput.project = project
    releaseInput.manager = manager
    releaseInput.leader = leader
    releaseInput.team = projectAwardData.team
    releaseInput.initial = initial
    releaseInput.name = projectAwardData.releaseVersionName
    releaseInput.status = SC.STATUS_PLAN_REQUESTED
    releaseInput.user = user

    return await ReleaseModel.create(releaseInput)
}


releaseSchema.statics.getReleases = async (status, user) => {
    if (!user || (!userHasRole(user, SC.ROLE_NEGOTIATOR)))
        throw new AppError('Only user with of the roles [' + SC.ROLE_NEGOTIATOR + '] can get projects releases', EC.INVALID_USER, EC.HTTP_BAD_REQUEST)

    let filter = {"user._id": user._id}
    if (status && status.toLowerCase() != "all")
        filter = {"user._id": user._id, "status": status}
    else
        filter = {"user._id": user._id}

    return await ReleaseModel.find(filter)
}

releaseSchema.statics.getReleaseById = async (releaseId, user) => {
    if (!user || (!userHasRole(user, SC.ROLE_NEGOTIATOR)))
        throw new AppError('Only user with of the roles [' + SC.ROLE_NEGOTIATOR + '] can get projects releases', EC.INVALID_USER, EC.HTTP_BAD_REQUEST)

    return await ReleaseModel.find({"_id": releaseId, "user._id": user._id})
}


//Reporting
releaseSchema.statics.getAllReportingProjectsAndTaskPlans = async (ParamsInput, user) => {
    //ParamsInput.projectStatus
    //ParamsInput.planDate
    //ParamsInput.taskStatus
    let momentPlanningDate = moment(ParamsInput.planDate)
    console.log("moment(ParamsInput.planDate)", moment(ParamsInput.planDate))
    let momentPlanningDateStringToDate = momentPlanningDate.toDate()

    console.log("momentPlanningDate.toDate()", momentPlanningDate.toDate())
    let momentTzPlanningDateString = momentTZ.tz(momentPlanningDateStringToDate, SC.DATE_FORMAT, SC.DEFAULT_TIMEZONE).hour(0).minute(0).second(0).millisecond(0)

    console.log("momentPlanningDate Time Zone", momentTzPlanningDateString)
    let reportDate = momentTzPlanningDateString


    let matchConditionArray = []
    if (ParamsInput.projectStatus != 'all') {
        matchConditionArray.push({$match: {status: ParamsInput.projectStatus}})
    }

    matchConditionArray.push({
        $lookup: {
            from: 'taskplannings',
            localField: '_id',
            foreignField: 'release._id',
            as: 'taskPlans'
        }
    })

    console.log("reportDate", reportDate)
    //matchConditionArray.push({$unwind: {path: '$taskPlans'}})
    //matchConditionArray.push({$match: {"taskPlans.planningDate": reportDate}})

    let releases1 = await ReleaseModel.aggregate(matchConditionArray).exec()
    /*
    *  {
        $lookup: {
            from: 'taskplannings',
            localField: 'taskPlans._id',
            foreignField: '_id',
            as: 'taskPlans'
        }
    }, {
        $group: {
            _id: "$_id",
            created: "$created",
            planningDate: "$planningDate",
            planningDateString: "$planningDateString",
            isShifted: "$isShifted",
            canMerge: "$canMerge",
            task: "$task",
            release: "$release",
            releasePlan: "$releasePlan",
            employee: "$employee",
            flags: "$flags",
            planning: "$planning",
            report: "$report",
            taskPlans: {
                $push: {$arrayElemAt: ['$taskPlans', 0]}
            }
        }
    }*/
    /*
        let releases2 = await ReleaseModel.aggregate({}, {
            $lookup: {
                from: 'taskplannings',
                let: {releaseID: "$_id"},
                pipeline: [{
                    $match: {
                        $expr: {
                            $and: [
                                {$eq: ["$release._id", "$$releaseID"]},
                                {$eq: ["$planningDate", reportDate]}
                            ]
                        }
                    }
                }],
                as: 'taskPlans'
            }
        }).exec()
    */
    return releases1
}

const ReleaseModel = mongoose.model("Release", releaseSchema)
export default ReleaseModel
