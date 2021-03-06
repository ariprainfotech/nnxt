import mongoose from 'mongoose'
import AppError from '../AppError'
import * as MDL from "../models"
import * as EC from '../errorcodes'
import logger from "../logger";


mongoose.Promise = global.Promise

let projectSchema = mongoose.Schema({
    name: {
        type: String, required: [true, 'Project name is required']
    },
    code: {type: String, required: [true, 'Code is required']},
    codeCounter: {type: Number, default: 0},
    client: {
        _id: mongoose.Schema.ObjectId,
        name: String
    },
    isDeleted: {type: Boolean, default: false},
    isArchived: {type: Boolean, default: false},
    canHardDelete: {type: Boolean, default: true},
    isActive: {type: Boolean, default: true},
})

projectSchema.statics.getAllActive = async (loggedInUser) => {
    // Negotiator can see all projects (Estimation Initiate)
    return await ProjectModel.find({isDeleted: false, isArchived: false}).exec()
}

projectSchema.statics.search = async (criteria) => {
    console.log("search called ", criteria)
    if (criteria) {
        let filter = {}

        if (criteria.isActive != undefined) {
            filter['isActive'] = criteria.isActive
        }

        if (criteria.name) {
            filter['client.name'] = criteria.name
        }

        if (criteria._id) {
            filter['client._id'] = criteria._id
        }

        logger.debug("searchRelease() ", {filter})
        return await ProjectModel.find(filter)
    }

    return []
}

projectSchema.statics.getProjectsOfReleasesInvolved = async (loggedInUser) => {
    // Get all releases that this logged in user involved in

    let projectIDs = await MDL.ReleaseModel.distinct(
        'project._id',
        {
            $or: [{
                'manager._id': loggedInUser._id,
                'leader._id': loggedInUser._id,
                'team._id': loggedInUser._id,
                'nonProjectTeam._id': loggedInUser._id
            }]
        })

    return projectIDs
}

projectSchema.statics.getProjectsOfEstimationsInvolved = async (loggedInUser) => {
    // Get all releases that this logged in user involved in

    let projectIDs = await MDL.EstimationModel.distinct(
        'project._id',
        {
            $or: [
                {'estimator._id': loggedInUser._id},
                {'negotiator._id': loggedInUser._id}
            ]
        })

    return await MDL.ProjectModel.find({"_id": {$in: projectIDs}})
    return projectIDs
}

projectSchema.statics.saveProject = async projectInput => {
    if (await ProjectModel.exists(projectInput.name, projectInput.client._id))
        throw new AppError("Project with name [" + projectInput.name + "] already exists under this client", EC.ALREADY_EXISTS, EC.HTTP_BAD_REQUEST)

    let client = await MDL.ClientModel.findById(projectInput.client._id)
    if (!client)
        throw new AppError("No such client", EC.NOT_FOUND, EC.HTTP_BAD_REQUEST)

    let count = await MDL.ProjectModel.count({code: projectInput.code})

    if (count > 0)
        throw new AppError('Code [' + projectInput.code + '] already taken');

    projectInput.client = client
    return await ProjectModel.create(projectInput)
}

projectSchema.statics.exists = async (name, clientId) => {
    if (!name || !clientId)
        throw new AppError("ProjectModel->exists() method needs non-null name/clientId parameter", EC.BAD_ARGUMENTS)
    let count = await ProjectModel.count({'name': name, 'client._id': clientId})
    if (count > 0)
        return true
    return false
}
projectSchema.statics.delete = async (id) => {
    let response = await ProjectModel.findById(id).remove()
    return response
}
projectSchema.statics.softDelete = async (id) => {
    let project = await ProjectModel.findById(id)
    let response = undefined


    let associationCount = await MDL.EstimationModel.count({
        'project._id': project._id,
        'isDeleted': false
    }) || await MDL.ReleaseModel.count({
        'project._id': project._id,
    })

    console.log("association count is ", associationCount)

    if (associationCount > 0) {
        throw new AppError('Cant remove, Project associated with Estimations/Releases.', EC.PROJECT_USED_IN_ESTIMATION, EC.HTTP_BAD_REQUEST)
    }

    response = await ProjectModel.findById(id).remove()
    return response
}

projectSchema.statics.editProject = async projectInput => {
    let project = await ProjectModel.findById(projectInput._id)
    //let count = await ProjectModel.count({'name': projectInput.name, 'client._id': projectInput.client._id})
    if (await ProjectModel.exists(projectInput.name, projectInput.client._id)) {
        throw new AppError("Project [" + project.client._id + "] already exists", EC.ALREADY_EXISTS, EC.HTTP_BAD_REQUEST)
    }
    if (project) {
        project.name = projectInput.name
        let client = await MDL.ClientModel.findById(projectInput.client._id)
        if (!client) {
            throw new AppError("Client Not Found", EC.NOT_FOUND, EC.HTTP_BAD_REQUEST)
        }
        project.client = client
        return await project.save()
    }
}


projectSchema.statics.isActiveProject = async (id) => {
    let project = await ProjectModel.findById(id)
    if (!project) {
        throw new AppError("project Not Found", EC.NOT_FOUND, EC.HTTP_BAD_REQUEST)
    }
    project.isActive = !project.isActive
    return await project.save()

}

const ProjectModel = mongoose.model('Project', projectSchema)
export default ProjectModel
