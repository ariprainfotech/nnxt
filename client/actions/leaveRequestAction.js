import * as AC from "./actionConsts"
import {editProject} from "./projectAction";
import {addClients} from "./clientAction";



export const addLeaveRequests = (leaveRequests) => ({
    type: AC.ADD_LEAVE_REQUESTS,
    leaveRequests: leaveRequests
})

export const addLeaveRequest = (leaveRequest) => ({
    type: AC.ADD_LEAVE_REQUEST,
    leaveRequest: leaveRequest
})
export const cancelLeaveRequest = (leaveRequest) => ({

    type: AC.CANCEL_LEAVE_REQUEST,
    leaveRequest: leaveRequest
})

export const addLeaveTypes = (leaveTypes) => ({
    type: AC.ADD_LEAVE_TYPES,
    leaveTypes: leaveTypes
})

export const addLeaveRequestOnServer = (formInput) => {
    return function (dispatch, getState) {
        return fetch('/api/leave',
            {
                method: "post",
                credentials: "include",
                headers: {
                    'Accept': 'application/json, text/plain, */*',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formInput)
            }
        ).then(
            response => {
                return response.json()
            }
        ).then(json => {
                if (json.success) {
                    dispatch(addLeaveRequest(json.data))
                }

                return json
            }
        )
    }
}

export const getAllLeaveRequestFromServer = (formInput) => {
    return function (dispatch, getState) {
        return fetch('/api/leave',
            {
                method: "get",
                credentials: "include",
                headers: {
                    'Accept': 'application/json, text/plain, */*',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formInput)
            }
        ).then(
            response => {
                return response.json()
            }
        ).then(json => {
                if (json.success) {
                    dispatch(addLeaveRequests(json.data))
                }

                return json
            }
        )
    }
}
export const cancelLeaveRequestFromServer = (formInput) => {
    return function (dispatch, getState) {
        return fetch('/api/leave/cancel-request',
            {
                method: "put",
                credentials: "include",
                headers: {
                    'Accept': 'application/json, text/plain, */*',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formInput)
            }
        ).then(
            response => {
                return response.json()
            }
        ).then(json => {
                if (json.success) {
                    dispatch(cancelLeaveRequest(json.data))
                }

                return json
            }
        )
    }
}
export const getAllLeavetypesFromServer = () => {
    return (dispatch, getState) => {
        return fetch('/api/leave/leave-types', {
                method: 'get',
                credentials: "include",
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json'
                }
            }
        ).then(
            response => response.json()
        ).then(
            json => {
                if (json.success) {
                    dispatch(addLeaveTypes(json.data))
                }
            })

    }
}
