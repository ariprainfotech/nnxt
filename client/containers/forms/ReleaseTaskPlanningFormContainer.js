import {connect} from 'react-redux'
import {ReleaseTaskPlanningForm} from "../../components"
import * as A from "../../actions"
import * as COC from "../../components/componentConsts";
import {NotificationManager} from 'react-notifications'

const mapDispatchToProps = (dispatch, ownProps) => ({
    onSubmit: (task) => {
        task.planning.plannedHours = Number(task.planning.plannedHours)
        return dispatch(A.addTaskPlanningOnServer(task)).then(json => {
            if (json.success) {
                NotificationManager.success("Task Planning Added")
                dispatch(A.hideComponent(COC.RELEASE_TASK_PLANNING_FORM_DIALOG))
            }
            else NotificationManager.error("Task Planning Not Added")
        })

    }
})

const mapStateToProps = (state, ownProps) => ({
    releaseTeam: state.release && state.release.selectedRelease && state.release.selectedRelease.team && state.release.selectedRelease.team.length ? state.release.selectedRelease.team : [],
    allTeam: state.user.allDevelopers && state.user.allDevelopers ? state.user.allDevelopers : [],
    initial: state.release.selectedRelease.initial
})


const ReleaseTaskPlanningFormContainer = connect(
    mapStateToProps,
    mapDispatchToProps
)(ReleaseTaskPlanningForm)

export default ReleaseTaskPlanningFormContainer