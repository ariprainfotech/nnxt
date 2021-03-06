import Router from 'koa-router'
import * as MDL from "../models"
import releaseRouter from "./release-router";

/***
 * Added prefix
 */

let taskPlanRouter = new Router({
    prefix: "/task-plans"
})

/***
 * Add task planning  in which logged in user is involved as a manager or leader
 ***/
taskPlanRouter.post("/", async ctx => {
    console.log('add task', ctx.request.body)
    return await MDL.TaskPlanningModel.addTaskPlan(ctx.request.body, ctx.state.user, ctx.schemaRequested, ctx.conf.server.mode)
})

/***
 * Deletion of task plan by leader or manager of that release
 ***/
taskPlanRouter.del("/:planID", async ctx => {
    return await MDL.TaskPlanningModel.deleteTask(ctx.params.planID, ctx.state.user)
})

/**
 * Completed tasks can be re-opened by Manager/Leader if they think task is not completed as per their review
 */
taskPlanRouter.put("/:taskID/reopen", async ctx => {
    return await MDL.TaskPlanningModel.reopenTask(ctx.params.taskID, ctx.state.user)
})


/***
 * Get all task plannings by release plan Id
 ***/
taskPlanRouter.get("/release-plan/:releasePlanID", async ctx => {
    return await MDL.TaskPlanningModel.getTaskPlansOfReleasePlan(ctx.params.releasePlanID, ctx.state.user)
})

/**
 * Get all task planning of a release
 */
taskPlanRouter.get("/release/:releaseID", async ctx => {
    console.log("ctx.params.releaseID", ctx.params.releaseID)
    return await MDL.TaskPlanningModel.getAllTaskPlannings(ctx.params.releaseID, ctx.state.user)
})

taskPlanRouter.post('/search', async ctx => {
    return await MDL.TaskPlanningModel.searchTaskPlans(ctx.request.body, ctx.state.user)
})

/***
 * Get task planning schedule according to developer
 ***/
taskPlanRouter.get("/employee/:employeeID/fromDate/:fromDate/toDate/:toDate/release/:releaseID", async ctx => {
    return await MDL.TaskPlanningModel.getTaskPlanningDetailsByEmpIdAndFromDateToDate(ctx.params.employeeID, ctx.params.releaseID, ctx.params.fromDate, ctx.params.toDate, ctx.state.user)

})

/***
 * Move task to another date
 ***/
taskPlanRouter.put("/:taskID/move", async ctx => {
    console.log("inside move")
    return await MDL.TaskPlanningModel.moveTask(ctx.request.body, ctx.state.user, ctx.schemaRequested)
})


export default taskPlanRouter