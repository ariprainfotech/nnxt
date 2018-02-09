import Router from 'koa-router'
import {EstimationModel, EstimationTaskModel, EstimationFeatureModel} from "../models"
import {hasRole, isAuthenticated} from "../utils"
import {ROLE_ESTIMATOR, ROLE_NEGOTIATOR} from "../serverconstants";
import {ACCESS_DENIED, HTTP_FORBIDDEN} from "../errorcodes"
import AppError from '../AppError'
import {toObject} from 'tcomb-doc'
import * as SC from '../serverconstants'
import {
    validate,
    generateSchema,
    estimationInitiationStruct,
    estimationEstimatorAddTaskStruct,
    estimationNegotiatorAddTaskStruct,
    estimationEstimatorUpdateTaskStruct,
    estimationEstimatorAddFeatureStruct,
    estimationEstimatorUpdateFeatureStruct,
    estimationEstimatorMoveToFeatureStruct,
    estimationEstimatorMoveOutOfFeatureStruct,
    estimationNegotiatorAddFeatureStruct,
    estimationEstimatorRequestEditPermissionToTaskStruct,
    estimationEstimatorRequestRemovalToTaskStruct,
    estimationNegotiatorUpdateFeatureStruct,
    estimationNegotiatorMoveToFeatureStruct,
    estimationNegotiatorMoveOutOfFeatureStruct,
    estimationNegotiatorGrantEditPermissionToTaskStruct,
    estimationNegotiatorApproveTaskStruct,
    estimationNegotiatorApproveFeatureStruct,
    estimationApproveByNegotiatorStruct,
    estimationProjectAwardByNegotiatorStruct
} from "../validation"

let estimationRouter = new Router({
    prefix: "estimations"
})

estimationRouter.get("/", async ctx => {
    return await EstimationModel.getAllActive(ctx.state.user)
})

estimationRouter.get("/:estimationID", async ctx => {
    let estimation = await EstimationModel.getById(ctx.params.estimationID)
    if (estimation) {
        // check to see role of logged in user in this estimation

        if (estimation.estimator._id == ctx.state.user._id)
            estimation.loggedInUserRole = SC.ROLE_ESTIMATOR
        else if (estimation.negotiator._id == ctx.state.user._id)
            estimation.loggedInUserRole = SC.ROLE_NEGOTIATOR
        else {
            throw new AppError("Not allowed to see estimation details", ACCESS_DENIED, HTTP_FORBIDDEN)
        }

    }
    return estimation
})

/**
 * Initiate estimation by Negotiator
 */

estimationRouter.post('/initiate', async ctx => {
    // Return expected schema
    if (ctx.schemaRequested)
        return generateSchema(estimationInitiationStruct)

    if (!hasRole(ctx, ROLE_NEGOTIATOR))
        throw new AppError("Only users with role [" + ROLE_NEGOTIATOR + "] can initiate estimation", ACCESS_DENIED, HTTP_FORBIDDEN)

    return await EstimationModel.initiate(ctx.request.body, ctx.state.user)
})


/**
 * Used for making estimation request by Negotiator
 */
estimationRouter.put('/request/:estimationID', async ctx => {
    if (!hasRole(ctx, ROLE_NEGOTIATOR))
        throw new AppError("Only users with role [" + ROLE_NEGOTIATOR + "] can request estimation", ACCESS_DENIED, HTTP_FORBIDDEN)
    return EstimationModel.request(ctx.params.estimationID, ctx.state.user)
})

/**
 * User by Estimator to request review from Negotiator
 */
estimationRouter.put('/review-request/:estimationID', async ctx => {
    return await EstimationModel.requestReview(ctx.params.estimationID, ctx.state.user)
})

estimationRouter.put('/change-request/:estimationID', async ctx => {
    return await EstimationModel.requestChange(ctx.params.estimationID, ctx.state.user)
})



/**
 * Add a new task to estimation
 */
estimationRouter.post('/tasks', async ctx => {
    if (hasRole(ctx, ROLE_ESTIMATOR)) {
        if (ctx.schemaRequested)
            return generateSchema(estimationEstimatorAddTaskStruct)
        return await EstimationTaskModel.addTaskByEstimator(ctx.request.body, ctx.state.user)

    } else if (hasRole(ctx, ROLE_NEGOTIATOR)) {
        if (ctx.schemaRequested)
            return generateSchema(estimationNegotiatorAddTaskStruct)
        return await EstimationTaskModel.addTaskByNegotiator(ctx.request.body, ctx.state.user)
    } else {
        throw new AppError("Only users with role [" + ROLE_ESTIMATOR + "," + ROLE_NEGOTIATOR + "] can add task into estimation", ACCESS_DENIED, HTTP_FORBIDDEN)
    }
})

/**
 * Update a new task to estimation
 */
estimationRouter.put('/tasks', async ctx => {
    if (hasRole(ctx, ROLE_ESTIMATOR)) {
        if (ctx.schemaRequested)
            return generateSchema(estimationEstimatorUpdateTaskStruct)
        return await EstimationTaskModel.updateTaskByEstimator(ctx.request.body, ctx.state.user)
    } else if (hasRole(ctx, ROLE_NEGOTIATOR)) {
        return "not implemented"
    } else {
        throw new AppError("Only users with role [" + ROLE_ESTIMATOR + "," + ROLE_NEGOTIATOR + "] can update task into estimation", ACCESS_DENIED, HTTP_FORBIDDEN)
    }
})

/**
 * Get all tasks of estimation by ID
 */
estimationRouter.get('/task/:estimationID', async ctx => {
    if (isAuthenticated(ctx)) {
        return await EstimationTaskModel.getAllTaskOfEstimation(ctx.params.estimationID)
    } else {
        throw new AppError("Not authenticated user.", ACCESS_DENIED, HTTP_FORBIDDEN)
    }
})

/**
 * Add a new feature to estimation
 */
estimationRouter.post('/features', async ctx => {
    if (hasRole(ctx, ROLE_ESTIMATOR)) {
        if (ctx.schemaRequested)
            return generateSchema(estimationEstimatorAddFeatureStruct)
        return await EstimationFeatureModel.addFeatureByEstimator(ctx.request.body, ctx.state.user)

    } else if (hasRole(ctx, ROLE_NEGOTIATOR)) {
        if (ctx.schemaRequested)
            return generateSchema(estimationNegotiatorAddFeatureStruct)
        return await EstimationFeatureModel.addFeatureByNegotiator(ctx.request.body, ctx.state.user)
    } else {
        throw new AppError("Only users with role [" + ROLE_ESTIMATOR + "," + ROLE_NEGOTIATOR + "] can add features into estimation", ACCESS_DENIED, HTTP_FORBIDDEN)
    }
})

/**
 * Update a new features to estimation
 */
estimationRouter.put('/features', async ctx => {
    if (hasRole(ctx, ROLE_ESTIMATOR)) {
        if (ctx.schemaRequested)
            return generateSchema(estimationEstimatorUpdateFeatureStruct)
        return await EstimationFeatureModel.updateFeatureByEstimator(ctx.request.body, ctx.state.user)

    } else if (hasRole(ctx, ROLE_NEGOTIATOR)) {
        if (ctx.schemaRequested)
            return generateSchema(estimationNegotiatorUpdateFeatureStruct)
        return await EstimationFeatureModel.updateFeatureByNegotiator(ctx.request.body, ctx.state.user)
    } else {
        throw new AppError("Only users with role [" + ROLE_ESTIMATOR + "," + ROLE_NEGOTIATOR + "] can update features into estimation", ACCESS_DENIED, HTTP_FORBIDDEN)
    }
})

/**
 * Update a move to feature to estimation
 */
estimationRouter.put('/move-to-feature', async ctx => {
    if (hasRole(ctx, ROLE_ESTIMATOR)) {
        if (ctx.schemaRequested)
            return generateSchema(estimationEstimatorMoveToFeatureStruct)
        return await EstimationTaskModel.moveTaskToFeatureByEstimator(ctx.request.body, ctx.state.user)
    } else if (hasRole(ctx, ROLE_NEGOTIATOR)) {
        if (ctx.schemaRequested)
            return generateSchema(estimationNegotiatorMoveToFeatureStruct)
        return await EstimationTaskModel.moveTaskToFeatureByNegotiator(ctx.request.body, ctx.state.user)
    } else {
        throw new AppError("Only users with role [" + ROLE_ESTIMATOR + "," + ROLE_NEGOTIATOR + "] can move task to features into estimation", ACCESS_DENIED, HTTP_FORBIDDEN)
    }
})


/**
 * Update a move out of feature to estimation
 */
estimationRouter.put('/move-out-of-feature', async ctx => {
    if (hasRole(ctx, ROLE_ESTIMATOR)) {
        if (ctx.schemaRequested)
            return generateSchema(estimationEstimatorMoveOutOfFeatureStruct)
        return await EstimationTaskModel.moveTaskOutOfFeatureByEstimator(ctx.request.body, ctx.state.user)
    } else if (hasRole(ctx, ROLE_NEGOTIATOR)) {
        if (ctx.schemaRequested)
            return generateSchema(estimationNegotiatorMoveOutOfFeatureStruct)
        return await EstimationTaskModel.moveTaskOutOfFeatureByNegotiator(ctx.request.body, ctx.state.user)
    } else {
        throw new AppError("Only users with role [" + ROLE_ESTIMATOR + "," + ROLE_NEGOTIATOR + "] can move task out of features into estimation", ACCESS_DENIED, HTTP_FORBIDDEN)
    }
})


/**
 * Request removal of task to estimation
 */
estimationRouter.put('/request-removal-task', async ctx => {
    if (hasRole(ctx, ROLE_ESTIMATOR)) {
        if (ctx.schemaRequested)
            return generateSchema(estimationEstimatorRequestRemovalToTaskStruct)
        return await EstimationTaskModel.requestRemovalTaskByEstimator(ctx.request.body, ctx.state.user)

    } else if (hasRole(ctx, ROLE_NEGOTIATOR)) {
        return "not implemented"
    } else {
        throw new AppError("Only users with role [" + ROLE_ESTIMATOR + "," + ROLE_NEGOTIATOR + "] can request removal task into estimation", ACCESS_DENIED, HTTP_FORBIDDEN)
    }
})



/**
 * request Edit/Update permission task/feature by estimator to estimation
 * or cancel this request
 */
estimationRouter.put('/request-edit-permission-task', async ctx => {
    if (hasRole(ctx, ROLE_ESTIMATOR)) {
        if (ctx.schemaRequested)
            return generateSchema(estimationEstimatorRequestEditPermissionToTaskStruct)
        return await EstimationTaskModel.requestEditPermissionOfTaskByEstimator(ctx.request.body, ctx.state.user)
    } else if (hasRole(ctx, ROLE_NEGOTIATOR)) {
        return "not implemented"
    } else {
        throw new AppError("Only users with role [" + ROLE_ESTIMATOR + "," + ROLE_NEGOTIATOR + "] can request edit permission task into estimation", ACCESS_DENIED, HTTP_FORBIDDEN)
    }
})

/**
 * Delete task to estimation
 */
estimationRouter.del('/:estimationID/tasks/:taskID', async ctx => {
    if (hasRole(ctx, ROLE_ESTIMATOR)) {
        return await EstimationTaskModel.deleteTaskByEstimator(ctx.params, ctx.state.user)
    } else if (hasRole(ctx, ROLE_NEGOTIATOR)) {
        return "not implemented"
    } else {
        throw new AppError("Only users with role [" + ROLE_ESTIMATOR + "," + ROLE_NEGOTIATOR + "] can add features into estimation", ACCESS_DENIED, HTTP_FORBIDDEN)
    }
})

/**
 * Grant Edit/Update permission task/feature by negotiator to estimation
 * or cancel this request
 */
estimationRouter.put('/grant-edit-permission-task', async ctx => {
    if (hasRole(ctx, ROLE_NEGOTIATOR)) {
        if (ctx.schemaRequested)
            return generateSchema(estimationNegotiatorGrantEditPermissionToTaskStruct)
        return await EstimationTaskModel.grantEditPermissionOfTaskByNegotiator(ctx.request.body, ctx.state.user)
    } else {
        throw new AppError("Only user with role [" + ROLE_NEGOTIATOR + "] can grant edit permission of task into estimation", ACCESS_DENIED, HTTP_FORBIDDEN)
    }
})

estimationRouter.put('/approve-task', async ctx => {
    if (hasRole(ctx, ROLE_NEGOTIATOR)) {
        if (ctx.schemaRequested)
            return generateSchema(estimationNegotiatorApproveTaskStruct)
        return await EstimationTaskModel.approveTaskByNegotiator(ctx.request.body, ctx.state.user)
    } else {
        throw new AppError("Only user with role [" + ROLE_NEGOTIATOR + "] can approve task into estimation", ACCESS_DENIED, HTTP_FORBIDDEN)
    }
})

estimationRouter.put('/approve-feature', async ctx => {
    if (hasRole(ctx, ROLE_NEGOTIATOR)) {
        if (ctx.schemaRequested)
            return generateSchema(estimationNegotiatorApproveFeatureStruct)
        return await EstimationTaskModel.approveFeatureByNegotiator(ctx.request.body, ctx.state.user)
    } else {
        throw new AppError("Only user with role [" + ROLE_NEGOTIATOR + "] can approve feature into estimation", ACCESS_DENIED, HTTP_FORBIDDEN)
    }
})

estimationRouter.put('/approve-estimation', async ctx => {
    if (hasRole(ctx, ROLE_NEGOTIATOR)) {
        if (ctx.schemaRequested)
            return generateSchema(estimationApproveByNegotiatorStruct)
        return await EstimationModel.approveEstimationByNegotiator(ctx.request.body, ctx.state.user)
    } else {
        throw new AppError("Only user with role [" + ROLE_NEGOTIATOR + "] can approve estimation", ACCESS_DENIED, HTTP_FORBIDDEN)
    }
})

estimationRouter.put('/project-award', async ctx => {
    if (hasRole(ctx, ROLE_NEGOTIATOR)) {
        if (ctx.schemaRequested)
            return generateSchema(estimationProjectAwardByNegotiatorStruct)
        return await EstimationModel.projectAwardByNegotiator(ctx.request.body, ctx.state.user)
    } else {
        throw new AppError("Only user with role [" + ROLE_NEGOTIATOR + "] can project award of this estimation", ACCESS_DENIED, HTTP_FORBIDDEN)
    }
})
export default estimationRouter