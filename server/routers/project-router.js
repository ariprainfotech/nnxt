import Router from 'koa-router'
import {ProjectModel} from "../models"
import * as V from "../validation"

let projectRouter = new Router({
    prefix: "projects"
})

projectRouter.post("/", async ctx => {
    if (ctx.schemaRequested)
        return V.generateSchema(V.projectAdditionStruct)

    V.validate(ctx.request.body, V.projectAdditionStruct)
    return await ProjectModel.saveProject(ctx.request.body)
})

projectRouter.get("/", async ctx => {
    return await ProjectModel.getAllActive(ctx.state.user)
})
projectRouter.delete("/:id", async ctx => {
    return await ProjectModel.softDelete(ctx.params.id)
})
projectRouter.put('/', async ctx => {
    return await ProjectModel.editProject(ctx.request.body)
})
export default projectRouter