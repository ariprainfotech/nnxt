import mongoose from 'mongoose'
import AppError from '../AppError'
import {ProjectModel, UserModel, RepositoryModel, EstimationTaskModel, EstimationFeatureModel} from "./index"
import * as SC from '../serverconstants'
import * as EC from '../errorcodes'
import {userHasRole} from "../utils"
import {validate, estimationInitiationStruct, estimationEstimatorAddTaskStruct} from "../validation"
import _ from 'lodash'

mongoose.Promise = global.Promise

let estimationSchema = mongoose.Schema({
    status: {
        type: String,
        required: true,
        enum: [SC.STATUS_INITIATED, SC.STATUS_ESTIMATION_REQUESTED, SC.STATUS_REVIEW_REQUESTED, SC.STATUS_CHANGE_REQUESTED, SC.STATUS_APPROVED, SC.STATUS_REOPENED, SC.STATUS_PROJECT_AWARDED]
    },
    technologies: [String],
    description: String,
    created: Date,
    updated: Date,
    estimator: {
        _id: mongoose.Schema.ObjectId,
        firstName: String,
        lastName: String
    },
    negotiator: {
        _id: mongoose.Schema.ObjectId,
        firstName: String,
        lastName: String
    },
    client: {
        _id: mongoose.Schema.ObjectId,
        name: String
    },
    project: {
        _id: mongoose.Schema.ObjectId,
        name: String
    },
    release: {
        _id: mongoose.Schema.ObjectId,
        name: String
    },
    notes: [{
        name: {type: String, required: true},
        note: {type: String, required: true},
        date: {type: Date, default: Date.now()}
    }],
    statusHistory: [{
        name: String,
        status: String,
        date: {type: Date, default: Date.now()}
    }],
    isDeleted: {type: Boolean, default: false},
    isArchived: {type: Boolean, default: false},
    canHardDelete: {type: Boolean, default: true}
}, {
    usePushEach: true
})


estimationSchema.statics.getAllActive = async (user) => {

    console.log("user id is ", user._id)
    let estimations = []
    if (userHasRole(user, SC.ROLE_ESTIMATOR)) {
        console.log("user has estimator role")
        // Estimator would only see those estimations that don't have initiated status and this user is estimator
        let estimatorEstimations = await EstimationModel.find({
            isArchived: false,
            isDeleted: false,
            "estimator._id": mongoose.Types.ObjectId(user._id),
            status: {$ne: SC.STATUS_INITIATED}
        }, {
            description: 1,
            project: 1,
            client: 1,
            technologies: 1,
            estimator: 1,
            negotiator: 1,
            status: 1
        })

        console.log("estimator estimations ", estimatorEstimations)

        estimations = [...estimatorEstimations]

    }

    if (userHasRole(user, SC.ROLE_NEGOTIATOR)) {
        console.log("user has negotiator role")
        // Negotiator would only see all estimations where he is negotiator
        let negotiatorEstimations = await EstimationModel.find({
            isArchived: false,
            isDeleted: false,
            "negotiator._id": user._id
        }, {
            description: 1,
            project: 1,
            client: 1,
            technologies: 1,
            estimator: 1,
            negotiator: 1,
            status: 1
        })
        estimations = [...estimations, ...negotiatorEstimations]
    }
    return estimations
}

estimationSchema.statics.getById = async estimationID => {

    console.log("finding estimation with id ", estimationID)
    //return await EstimationModel.findById(estimationID)
    // this API would return more details about selected estimation
    let estimations = await EstimationModel.aggregate({
        $match: {
            _id: mongoose.Types.ObjectId(estimationID)
        },
    }, {
        $lookup: {
            from: 'estimationtasks',
            let: {estimationID: "$_id"},
            pipeline: [{
                $match: {
                    $expr: {
                        $and: [
                            {$eq: ["$estimation._id", "$$estimationID"]},
                            {$eq: [{$ifNull: ["$feature._id", true]}, true]}
                        ]
                    }
                }
            }],
            as: 'tasks'
        }
    }, {
        $lookup: {
            from: 'estimationfeatures',
            let: {estimationID: "$_id"},
            pipeline: [{
                $match: {
                    $expr: {
                        $and: [
                            {$eq: ["$estimation._id", "$$estimationID"]}
                        ]
                    }
                }

            }, {
                $lookup: {
                    from: 'estimationtasks',
                    localField: "_id",
                    foreignField: "feature._id",
                    as: "tasks"
                }
            }],
            as: 'features'
        }
    }).exec()

    if (Array.isArray(estimations) && estimations.length > 0) {
        return estimations[0]
    }

}

/**
 * Estimation request is initiated by Negotiator
 * @param estimationInput
 */
estimationSchema.statics.initiate = async (estimationInput, negotiator) => {

    // validate input
    validate(estimationInput, estimationInitiationStruct)

    // enhance estimation input as per requirement
    if (!negotiator || !userHasRole(negotiator, SC.ROLE_NEGOTIATOR))
        throw new AppError('Not a negotiator', EC.INVALID_USER, EC.HTTP_BAD_REQUEST)

    let project = await ProjectModel.findById(estimationInput.project._id)
    if (!project)
        throw new AppError('Project not found', EC.NOT_FOUND, EC.HTTP_BAD_REQUEST)

    let estimator = await UserModel.findById(estimationInput.estimator._id)
    if (!userHasRole(estimator, SC.ROLE_ESTIMATOR))
        throw new AppError('Not an estimator', EC.INVALID_USER, EC.HTTP_BAD_REQUEST)

    if (!estimator)
        throw new AppError('Estimator not found', EC.NOT_FOUND, EC.HTTP_BAD_REQUEST)

    estimationInput.status = SC.STATUS_INITIATED
    estimationInput.project = project
    estimationInput.client = project.client
    estimationInput.estimator = estimator
    estimationInput.negotiator = negotiator
    estimationInput.statusHistory = [{
        name: negotiator.firstName,
        status: SC.STATUS_INITIATED

    }]

    let estimation = await EstimationModel.create(estimationInput)
    estimation.loggedInUserRole = SC.ROLE_NEGOTIATOR
    return estimation
}

estimationSchema.statics.request = async (estimationID, negotiator) => {
    let estimation = await EstimationModel.findById(estimationID)
    if (!estimation)
        throw new AppError('No such estimation', EC.NOT_FOUND, EC.HTTP_BAD_REQUEST)

    if (estimation.negotiator._id != negotiator._id)
        throw new AppError('This estimation has different negotiator', EC.INVALID_USER, EC.HTTP_BAD_REQUEST)

    if (estimation.status != SC.STATUS_INITIATED)
        throw new AppError('Only estimations with status [' + SC.STATUS_INITIATED + "] can be requested", EC.INVALID_OPERATION, EC.HTTP_BAD_REQUEST)

    estimation.status = SC.STATUS_ESTIMATION_REQUESTED
    estimation.statusHistory.push({
        name: estimation.negotiator.firstName,
        status: SC.STATUS_ESTIMATION_REQUESTED
    })
    await estimation.save()
    estimation = estimation.toObject()
    estimation.loggedInUserRole = SC.ROLE_NEGOTIATOR
    return estimation
}

estimationSchema.statics.requestReview = async (estimationID, estimator) => {
    let estimation = await EstimationModel.findById(estimationID)
    if (!estimation)
        throw new AppError('No such estimation', EC.NOT_FOUND, EC.HTTP_BAD_REQUEST)

    if (!userHasRole(estimator, SC.ROLE_ESTIMATOR))
        throw new AppError('Not an estimator', EC.INVALID_USER, EC.HTTP_BAD_REQUEST)

    if (estimation.estimator._id != estimator._id)
        throw new AppError('Not an estimator of this estimation', EC.INVALID_USER, EC.HTTP_BAD_REQUEST)

    if (!_.includes([SC.STATUS_ESTIMATION_REQUESTED, SC.STATUS_CHANGE_REQUESTED], estimation.status))
        throw new AppError('Only estimations with status [' + SC.STATUS_ESTIMATION_REQUESTED + "," + SC.STATUS_CHANGE_REQUESTED + "] can be requested for review", EC.INVALID_OPERATION, EC.HTTP_BAD_REQUEST)


    await EstimationTaskModel.update({
        "estimation._id": estimation._id,
        "owner": SC.OWNER_NEGOTIATOR
    }, {$set: {addedInThisIteration: false}}, {multi: true})

    await EstimationTaskModel.update({
        "estimation._id": estimation._id,
    }, {$set: {"negotiator.changedInThisIteration": false, "negotiator.changeRequested": false}}, {multi: true})

    await EstimationFeatureModel.update({
        "estimation._id": estimation._id,
        "owner": SC.OWNER_NEGOTIATOR
    }, {$set: {addedInThisIteration: false}}, {multi: true})

    await EstimationFeatureModel.update({
        "estimation._id": estimation._id
    }, {$set: {"negotiator.changedInThisIteration": false, "negotiator.changeRequested": false}}, {multi: true})

    estimation = await EstimationModel.findOneAndUpdate({_id: estimation._id}, {
        $set: {status: SC.STATUS_REVIEW_REQUESTED},
        $push: {
            statusHistory: {
                name: estimator.firstName,
                status: SC.STATUS_REVIEW_REQUESTED
            }
        }
    }, {
        new: true,
        lean: true
    })
    estimation.loggedInUserRole = SC.ROLE_ESTIMATOR
    return estimation
}

estimationSchema.statics.requestChange = async (estimationID, negotiator) => {
    let estimation = await EstimationModel.findById(estimationID)
    if (!estimation)
        throw new AppError('No such estimation', EC.NOT_FOUND, EC.HTTP_BAD_REQUEST)

    if (!userHasRole(negotiator, SC.ROLE_NEGOTIATOR))
        throw new AppError('Not a negotiator', EC.INVALID_USER, EC.HTTP_BAD_REQUEST)

    if (estimation.negotiator._id != negotiator._id)
        throw new AppError('Not a negotiator of this estimation', EC.INVALID_USER, EC.HTTP_BAD_REQUEST)

    if (!_.includes([SC.STATUS_REVIEW_REQUESTED], estimation.status))
        throw new AppError("Only estimations with status [" + SC.STATUS_REVIEW_REQUESTED + "] can be requested for change", EC.INVALID_OPERATION, EC.HTTP_BAD_REQUEST)

    await EstimationTaskModel.update({
        "estimation._id": estimation._id,
        "owner": SC.OWNER_ESTIMATOR
    }, {$set: {addedInThisIteration: false, "estimator.changedInThisIteration": false}}, {multi: true})

    await EstimationFeatureModel.update({
        "estimation._id": estimation._id,
        "owner": SC.OWNER_ESTIMATOR
    }, {$set: {addedInThisIteration: false, "estimator.changedInThisIteration": false}}, {multi: true})

    estimation = await EstimationModel.findOneAndUpdate({_id: estimation._id}, {
        $set: {status: SC.STATUS_CHANGE_REQUESTED},
        $push: {
            statusHistory: {
                name: negotiator.firstName,
                status: SC.STATUS_CHANGE_REQUESTED
            }
        }
    }, {
        new: true,
        lean: true
    })
    estimation.loggedInUserRole = SC.ROLE_NEGOTIATOR
    return estimation


}


estimationSchema.statics.approveEstimationByNegotiator = async (estimationInput, negotiator) => {
    let estimation = await EstimationModel.findById(estimationInput._id)
    if (!estimation)
        throw new AppError('No such estimation', EC.NOT_FOUND, EC.HTTP_BAD_REQUEST)

    if (!userHasRole(negotiator, SC.ROLE_NEGOTIATOR))
        throw new AppError('Not a negotiator', EC.INVALID_USER, EC.HTTP_BAD_REQUEST)

    if (estimation.negotiator._id != negotiator._id)
        throw new AppError('Not a negotiator of this estimation', EC.INVALID_USER, EC.HTTP_BAD_REQUEST)

    if (!_.includes([SC.STATUS_REVIEW_REQUESTED], estimation.status))
        throw new AppError("Only estimations with status [" + SC.STATUS_REVIEW_REQUESTED + "] can approve by negotiator", EC.INVALID_OPERATION, EC.HTTP_BAD_REQUEST)

    let pendingTaskList  = await EstimationTaskModel.find({"estimation._id" : estimation._id,status:SC.STATUS_PENDING})
    if(!pendingTaskList || pendingTaskList.length==0)
        throw new AppError('Estimations approve failed due to estimation have some task pending for approve', EC.INVALID_OPERATION, EC.HTTP_BAD_REQUEST)

    let pendingFeatureList  = await EstimationFeatureModel.find({"estimation._id" : estimation._id,status:SC.STATUS_PENDING})
    if(!pendingFeatureList || pendingFeatureList.length==0)
        throw new AppError('Estimations approve failed due to estimation have some feature pending for approve', EC.INVALID_OPERATION, EC.HTTP_BAD_REQUEST)

    let statusHistory = {}
    statusHistory.name = negotiator.firstName +' '+ negotiator.lastName
    statusHistory.status = SC.STATUS_APPROVED
    statusHistory.date = Date.now()

    let existingEstimationStatusHistory = estimation.statusHistory
    if(existingEstimationStatusHistory && existingEstimationStatusHistory.length>0)
        existingEstimationStatusHistory.push(statusHistory)
    else
        existingEstimationStatusHistory = [statusHistory]

    estimation.statusHistory = existingEstimationStatusHistory
    estimation.status = SC.STATUS_APPROVED
    estimation.updated = Date.now()
    
    return await estimation.save()
}

estimationSchema.statics.projectAwardByNegotiator = async (projectAwardEstimationInput, negotiator) => {

    if (!userHasRole(negotiator, SC.ROLE_NEGOTIATOR))
        throw new AppError('Not a negotiator', EC.INVALID_USER, EC.HTTP_BAD_REQUEST)

    let estimation = await EstimationModel.findById(projectAwardEstimationInput._id)
    if (!estimation)
        throw new AppError('No such estimation', EC.NOT_FOUND, EC.HTTP_BAD_REQUEST)

    if (estimation.negotiator._id != negotiator._id)
        throw new AppError('Not a negotiator of this estimation', EC.INVALID_USER, EC.HTTP_BAD_REQUEST)

    if (!_.includes([SC.STATUS_APPROVED], estimation.status))
        throw new AppError("Only estimations with status [" + SC.STATUS_APPROVED + "] can project award by negotiator", EC.INVALID_OPERATION, EC.HTTP_BAD_REQUEST)

    let release = {}

    //Note : this API is on hold because Project Award form is designing..........

    estimation.release = release
    estimation.status = SC.STATUS_PROJECT_AWARDED
    estimation.updated = Date.now()

    return await estimation.save()
}

const EstimationModel = mongoose.model("Estimation", estimationSchema)
export default EstimationModel