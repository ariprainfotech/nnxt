import {connect} from 'react-redux'
import {RoleForm} from "../../components"
import {change, formValueSelector, getFormSyncErrors, initialize, SubmissionError} from 'redux-form'
import * as COC from "../../components/componentConsts"
import * as EC from "../../../server/errorcodes"
import {NotificationManager} from 'react-notifications'
import * as A from "../../actions"


let selector = formValueSelector('role')

const mapDispatchToProps = (dispatch, ownProps) => ({
    onSubmit: (formValues) => {
        if (!formValues._id) {
            return dispatch(A.addRoleOnServer(formValues)).then(response => {
                if (response.success) {
                    NotificationManager.success("Role added successfully")
                    /*
                    dispatch(reset('role'))
                    dispatch(reset('role-permission'))
                    */
                    dispatch(A.showComponentHideOthers(COC.ROLE_LIST))

                } else {
                    NotificationManager.error("Role addition failed")
                    if (response.code && response.code == EC.ALREADY_EXISTS) {
                        // role already exists throw SubmissionError to show appropriate error
                        throw new SubmissionError({name: 'Role already exists'})
                    }
                }
            })
        } else {
            // Role is edited
            return dispatch(A.editRoleOnServer(formValues)).then(response => {
                if (response.success) {
                    NotificationManager.success("Role edited successfully")
                    dispatch(A.showComponentHideOthers(COC.ROLE_LIST))
                } else {
                    NotificationManager.error("Role edit failed")
                    throw new SubmissionError({name: 'Role already exists'})
                }
            })
        }
    },
    showRoleList: () => dispatch(A.showComponentHideOthers(COC.ROLE_LIST)),
    editPermission: (permission, idx) => {
        dispatch(change('role', 'selectedPermission', permission))
        dispatch(initialize('role-permission', permission))
        dispatch(change('role-permission', 'selectedIdx', idx))

    }
})

const mapStateToProps = (state, ownProps) => {
    let syncErrors = getFormSyncErrors('role')(state)
    let permissionsAdded = selector(state, 'permissions')
    let selectedPermission = selector(state, 'selectedPermission')
    let permissionOptions = state.permission.all
    if (Array.isArray(permissionsAdded) && permissionsAdded.length > 0) {
        permissionOptions = permissionOptions.filter(p => permissionsAdded.findIndex(p1 => p1._id == p._id) == -1)
    }

    if (selectedPermission) {
        // Add this selected permission with permission options this is done while editing permission
        permissionOptions = [selectedPermission, ...permissionOptions]
    }

    return {
        permissions: state.permission.all,
        permissionOptions,
        permissionFormValues: selector(state, 'permission', 'configurable', 'enabled'),
        permissionsAdded,
        roleSyncErrors: syncErrors,
        selectedPermission
    }
}

const RoleFormContainer = connect(
    mapStateToProps,
    mapDispatchToProps
)(RoleForm)

export default RoleFormContainer