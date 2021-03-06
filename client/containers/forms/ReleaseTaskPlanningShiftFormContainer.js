import {connect} from 'react-redux'
import {ReleaseTaskPlanningShiftForm} from '../../components'
import * as A from '../../actions'
import {NotificationManager} from 'react-notifications'
import {TASK_SHIFT_DIALOG} from "../../components/componentConsts";

const mapDispatchToProps = (dispatch, ownProps) => ({
    shiftTasksToFuture: (releaseId, employeeId, day, month, year, daysToShift) => {
        if (!daysToShift)
            return NotificationManager.error('Please select Number of days to shift')

        return dispatch(A.shiftTasksToFutureOnServer({
            releaseId,
            employeeId,
            day,
            month,
            year,
            daysToShift: Number(daysToShift)
        })).then(json => {
            if (json.success) {
                NotificationManager.success('Shifting to future date completed...')
                dispatch(A.hideComponent(TASK_SHIFT_DIALOG))
                dispatch(A.getEmployeeWorkCalendarFromServer(employeeId, month, year))
            }
            else NotificationManager.error(json.message)
        })

    },
    shiftTasksToPast: (releaseId, employeeId, day, month, year, daysToShift) => {
        if (!daysToShift)
            return NotificationManager.error('Please select Number of days to shift')

        return dispatch(A.shiftTasksToPastOnServer({
            releaseId,
            employeeId,
            day,
            month,
            year,
            daysToShift: Number(daysToShift)
        })).then(json => {
            if (json.success) {
                NotificationManager.success('Shifting to past date completed...')
                dispatch(A.hideComponent(TASK_SHIFT_DIALOG))
                dispatch(A.getEmployeeWorkCalendarFromServer(employeeId, month, year))
            }
            else NotificationManager.error(json.message)
        })
        /*
        if (!employeeId || !baseDate || !Number(daysToShift)) {
            if (!employeeId)
                return NotificationManager.error('Please select employee')
            else if (!baseDate)
                return NotificationManager.error('Please select base date')

            else if (!daysToShift)
                return NotificationManager.error('Please select Number of days to shift')

        }
        else return dispatch(A.shiftTasksToPastOnServer({
            employeeId: employeeId,
            baseDate: baseDate,
            daysToShift: Number(daysToShift),
            releasePlanID: releasePlanID
        })).then(json => {
            if (json.success) {
                NotificationManager.success('Plan shifted to past')
            }
            else NotificationManager.error('Plan shifting failed')
        })
        */
    }

})

const mapStateToProps = (state, ownProps) => {
    let days = [
        {'day': 1},
        {'day': 2},
        {'day': 3},
        {'day': 4},
        {'day': 5},
        {'day': 6},
        {'day': 7},
        {'day': 8},
        {'day': 9},
        {'day': 10},
        {'day': 11},
        {'day': 12},
        {'day': 13},
        {'day': 14},
        {'day': 15},
        {'day': 16},
        {'day': 17},
        {'day': 18},
        {'day': 19},
        {'day': 20},
        {'day': 21},
        {'day': 22},
        {'day': 23},
        {'day': 24},
        {'day': 25},
        {'day': 26},
        {'day': 27},
        {'day': 28},
        {'day': 29},
        {'day': 30}
    ]
    return {
        release: state.release.selectedRelease,
        team: state.user && state.user.allDevelopers && state.user.allDevelopers.length ? state.user.allDevelopers : [],
        days
    }
}


const ReleaseTaskPlanningShiftFormContainer = connect(
    mapStateToProps,
    mapDispatchToProps
)(ReleaseTaskPlanningShiftForm)

export default ReleaseTaskPlanningShiftFormContainer