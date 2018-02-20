import {connect} from 'react-redux'
import * as A from '../../actions'
import * as COC from '../../components/componentConsts'
import {ReleaseList} from "../../components"
import * as logger from '../../clientLogger'

const mapDispatchToProps = (dispatch, ownProps) => ({
    changeReleseStatus:(status)=> dispatch(A.getAllReleaseFromServer(status))
    /*
    showEstimationInitiateForm: () => {
        console.log("show estimation init form caled")
        dispatch(A.getAllProjectsFromServer())
        dispatch(A.getAllUsersFromServer())
        dispatch(A.getAllTechnologiesFromServer())
        dispatch(A.showComponent(COC.ESTIMATION_INITIATE_DIALOG))
    },
    estimationSelected: (estimation) => {
        logger.debug(logger.ESTIMATION_LIST_CONNECT, "estimation:", estimation)
        dispatch(A.getEstimationFromServer(estimation._id)).then(json => {
            dispatch(A.showComponentHideOthers(COC.ESTIMATION_DETAIL_PAGE))
        }),
        dispatch(A.getRepositoryFromServer(estimation.technologies,'all'))
    }
    */
})

const mapStateToProps = (state, ownProps) => {
    return {
        loggedInUser: state.user.loggedIn,
        releases: state.release.all
    }
}

const ReleaseListContainer = connect(
    mapStateToProps,
    mapDispatchToProps
)(ReleaseList)

export default ReleaseListContainer