import Router from 'koa-router'
import * as MDL from "../models"
import * as SC from "../serverconstants"
import * as EC from '../errorcodes'
import {hasRole} from "../utils"
import AppError from '../AppError'

const employeeRouter = new Router({
    prefix: "employees"
})
/**
 * Get all Employee setting  by ID
 */
employeeRouter.get("/employee-setting", async ctx => {
    if (!hasRole(ctx, SC.ROLE_ADMIN)) {
        throw new AppError("Access Denied", EC.ACCESS_DENIED, EC.HTTP_FORBIDDEN)
    }
    return await MDL.EmployeeSettingModel.getEmployeeSettings(ctx.state.user)
})
/**
 * Add Employee Setting
 */
employeeRouter.post("/employee-setting", async ctx => {
    if (!hasRole(ctx, SC.ROLE_ADMIN)) {
        throw new AppError("Access Denied", EC.ACCESS_DENIED, EC.HTTP_FORBIDDEN)
    }
    return await MDL.EmployeeSettingModel.createEmployeeSettings(ctx.request.body, ctx.state.user, ctx.schemaRequested)

})
/**
 * Update Employee Setting
 */
employeeRouter.put("/employee-setting", async ctx => {
    if (!hasRole(ctx, SC.ROLE_ADMIN)) {
        throw new AppError("Access Denied", EC.ACCESS_DENIED, EC.HTTP_FORBIDDEN)
    }
    return await MDL.EmployeeSettingModel.updateEmployeeSettings(ctx.request.body, ctx.state.user, ctx.schemaRequested)
})
export default employeeRouter