import * as AC from '../actions/actionConsts'

let initialState = {
    showLoader: false, // used to show/hide loader gif
    ssrFlag: false, // used for server side rendering
    visibleComponents: [], // which components should be visible in a particular tab,
    allReleases: [],
    selectedReleaseID: undefined
}

const appReducer = (state = initialState, action) => {

    switch (action.type) {
        case AC.SHOW_LOADER:
            return Object.assign({}, state, {
                showLoader: true
            })
        case AC.HIDE_LOADER:
            return Object.assign({}, state, {
                showLoader: false
            })
        case AC.SHOW_COMPONENT_HIDE_OTHER:
            return Object.assign({}, state, {
                visibleComponents: [action.name]
            })
        case AC.SHOW_COMPONENT:
            return Object.assign({}, state, {
                visibleComponents: [...state.visibleComponents, action.name]
            })
        case AC.HIDE_COMPONENT:
            return Object.assign({}, state, {
                visibleComponents: state.visibleComponents.filter(name => name !== action.name)
            })
        case AC.ADD_SSR_FLAG:
            let newState = Object.assign({}, state, {
                ssrFlag: true
            })
            console.log("new state is ", newState)
            return newState
        case AC.CLEAR_SSR_FLAG:
            return Object.assign({}, state, {
                ssrFlag: false
            })
        case AC.SET_RELEASE_ID:
            // while selection of reporting status it is set to state also
            return Object.assign({}, state, {
                selectedReleaseID: action.releaseID
            })
        case AC.ADD_USER_RELEASES:
            // All Releases where loggedIn user in involved as (manager, leader, developer)
            return Object.assign({}, state, {
                allReleases: action.releases
            })
        default:
            return state
    }
}

export default appReducer