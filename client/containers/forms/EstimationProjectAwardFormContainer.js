import {connect} from 'react-redux'
import {EstimationProjectAwardForm} from "../../components"
import * as logger from '../../clientLogger'
import * as A from '../../actions'
import * as COC from '../../components/componentConsts'
import {NotificationManager} from 'react-notifications'

const mapDispatchToProps = (dispatch, ownProps) => ({
    onSubmit: (values) => {
            logger.debug(logger.ESTIMATION_PROJECT_AWARD_FORM_SUBMIT, "values:", values)
            return dispatch(A.addProjectAwardOnServer(values)).then(json => {
                if (json.success) {
                    NotificationManager.success("Project Awarded")
                    // hide dialog
                    dispatch(A.hideComponent(COC.ESTIMATION_FEATURE_DIALOG))
                } else {
                    NotificationManager.error("Project Awardation Failed")
                }
            })
    }
})
const mapStateToProps = (state) => {

    let Managers = []
    let Leaders = []
    let Team = []


    if (state.user.userWithRoleCategory) {
        // Users who has role as a manager or leader or both
        Managers = state.user.userWithRoleCategory && state.user.userWithRoleCategory.managers ? state.user.userWithRoleCategory.managers : []
        Leaders = state.user.userWithRoleCategory && state.user.userWithRoleCategory.leaders ? state.user.userWithRoleCategory.leaders : []
        Team = state.user.userWithRoleCategory && state.user.userWithRoleCategory.team ?
            state.user.userWithRoleCategory.team.map((dev, idx) => {
                dev.name = dev.firstName + dev.lastName
                return dev
            })
            : []

    }

    return {
        Team,
        Managers,
        Leaders
    }
}

const EstimationProjectAwardFormContainer = connect(
    mapStateToProps,
    mapDispatchToProps
)(EstimationProjectAwardForm)

export default EstimationProjectAwardFormContainer