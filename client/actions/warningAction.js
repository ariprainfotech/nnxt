import * as AC from './actionConsts'
import * as A from '../actions'

export const addWarnings = (warnings) => ({
    type: AC.ADD_WARNINGS,
    warnings: warnings
})

export const getAllWarningsOfThisReleaseFromServer = (releaseID) => {
    return (dispatch, getState) => {
        return fetch('/api/warning/release/'+releaseID, {
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
                    dispatch(addWarnings(json.data))
                }
                return json
            })
    }
}