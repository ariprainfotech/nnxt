import {connect} from 'react-redux'
import {ReleaseTaskPlanningPage} from '../../components'
import {initialize} from 'redux-form'
import * as A from '../../actions'
import * as COC from '../../components/componentConsts'
import * as SC from '../../../server/serverconstants'
import {NotificationManager} from 'react-notifications'

const mapDispatchToProps = (dispatch, ownProps) => ({

    showTaskPlanningCreationForm: (releasePlan) => {
        dispatch(initialize("task-planning", {
            release: releasePlan.release,
            task: releasePlan.task,
            releasePlan: {
                _id: releasePlan._id,
            },
            flags: SC.REPORT_UNREPORTED,
            report: {
                status: SC.REPORT_PENDING
            }

        }))
        dispatch(A.showComponent(COC.RELEASE_TASK_PLANNING_FORM_DIALOG))
    },

    planTask: (taskPlanning) => dispatch(A.addTaskPlanningOnServer(taskPlanning)).then(json => {
        if (json.success) {
            NotificationManager.success("Task Planning Added")
        }
        else NotificationManager.error("Task Planning Failed")
    }),

    deleteTaskPlanningRow: (plan) => dispatch(A.deleteTaskPlanningFromServer(plan._id)).then(json => {
        if (json.success) {
            NotificationManager.success("Task Planning Deleted")
        }
        else NotificationManager.error("Task Planning Deletion Failed")
    }),

    mergeTaskPlanningRow: (plan) => console.log(" mergeTaskPlanningRow"),


    planTaskFilter: (taskPlanFilter) => dispatch(A.addTaskPlanningFiltersOnServer(taskPlanFilter)).then(json => {
        if (json.success) {
            NotificationManager.success("Task Planning Added")
        }
        else NotificationManager.error("Task Planning Failed")
    }),

    ReleaseTaskGoBack: (event) =>
        dispatch(A.showComponentHideOthers(COC.RELEASE_PROJECT_TASK_LIST))
})


const mapStateToProps = (state) => ({
    taskPlan: state.release.selectedTask,
    taskPlans: state.release.taskPlans,
    developerPlanned: state.release.developerPlanned,
    data: []
})

const ReleaseTaskPlanningPageContainer = connect(
    mapStateToProps,
    mapDispatchToProps
)(ReleaseTaskPlanningPage)

export default ReleaseTaskPlanningPageContainer
