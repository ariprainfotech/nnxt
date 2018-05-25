import mongoose from 'mongoose'
import AppError from '../AppError'
import * as SC from '../serverconstants'
import * as EC from '../errorcodes'
import {userHasRole} from "../utils"
import * as V from '../validation'

mongoose.Promise = global.Promise

let leaveSettingSchema = mongoose.Schema({

    casualLeaves: {type: Number, default: 4},
    paidLeaves: {type: Number, default: 8},
    maternityLeaves: {type: Number, default: 3},
    paternityLeaves: {type: Number, default: 5},
    specialLeaves: {type: Number, default: 6}
})

/**
 * Leave Setting is Created by Admin
 * @param leaveSettingInput
 */
leaveSettingSchema.statics.createLeaveSettings = async (leaveSettingInput, user) => {

    return await LeaveSettingModel.create(leaveSettingInput)
}
/**
 * Leave Setting is fetched
 */
leaveSettingSchema.statics.getLeaveSettings = async (user) => {
    if (!user || !(userHasRole(user, SC.ROLE_ADMIN) || userHasRole(user, SC.ROLE_MANAGER) || userHasRole(user, SC.ROLE_LEADER)))
        throw new AppError('Not allowed to get information on role with [' + SC.ROLE_ADMIN + "or" + SC.ROLE_MANAGER + "or" + SC.ROLE_LEADER + '] can get leave details', EC.INVALID_USER, EC.HTTP_BAD_REQUEST)

    let leaveSettings = await LeaveSettingModel.find({})
    return leaveSettings && leaveSettings.length ? leaveSettings[0] : {}
}
/**
 * Leave Setting is updated by Admin
 * @param leaveSettingInput
 */
leaveSettingSchema.statics.updateLeaveSettings = async (leaveSettingInput, admin) => {
    if (!admin || !userHasRole(admin, SC.ROLE_ADMIN))
        throw new AppError('Not a Admin', EC.INVALID_USER, EC.HTTP_BAD_REQUEST)

    let leaveSetting = await LeaveSettingModel.findById(mongoose.Types.ObjectId(leaveSettingInput._id))
    if (!leaveSetting) {
        throw new AppError('leaveSetting  not found', EC.NOT_FOUND, EC.HTTP_BAD_REQUEST)
    }
    leaveSetting.casualLeaves = leaveSettingInput.casualLeaves
    leaveSetting.paidLeaves = leaveSettingInput.paidLeaves
    leaveSetting.maternityLeaves = leaveSettingInput.maternityLeaves
    leaveSetting.paternityLeaves = leaveSettingInput.paternityLeaves
    leaveSetting.specialLeaves = leaveSettingInput.specialLeaves

    return await leaveSetting.save()
}


const LeaveSettingModel = mongoose.model("leaveSetting", leaveSettingSchema)
export default LeaveSettingModel