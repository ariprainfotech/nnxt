import React, {Component} from 'react'
import {withRouter} from 'react-router-dom'
import * as SC from '../../../server/serverconstants'
import moment from 'moment'
import momentTZ from 'moment-timezone'
import {
    TaskPlanListContainer,
    ReleasePlanListContainer,
    WarningListContainer,
    TaskReportListContainer,
    ReleaseDashboardSectionContainer
} from '../../containers'

class ReleasePlanSection extends Component {

    constructor(props) {
        super(props);
        this.options = {
            onRowClick: this.onRowClick.bind(this)
        }
    }

    componentDidMount() {
        console.log("ReleasePlanSection-> componentDidMount() called")
    }

    onRowClick(row) {
        this.props.history.push("/app-home/release-task-planning")
        this.props.releasePlanSelected(row, this.props.release.rolesInThisRelease)
    }

    render() {
        let team = 0
        const {release, loggedInUser, selectedTab} = this.props

        let isManager = loggedInUser && loggedInUser._id && release.manager._id && loggedInUser._id.toString() === release.manager._id.toString() ? true : false
        let isLeader = loggedInUser && loggedInUser._id && release.leader._id && loggedInUser._id.toString() === release.leader._id.toString() ? true : false
        let isManagement = loggedInUser && loggedInUser.roleNames.indexOf(SC.ROLE_TOP_MANAGEMENT) > -1 ? true : false
        console.log("isManager ", isManager, " | isLeader ", isLeader, " | isManagement ", isManagement)


        return (

            <div key="estimation_list" className="clearfix">

                <div className="col-md-12 releaseHeader">
                    <div className=" col-md-1 backarrow" title="Go Back">
                        <button className="btn-link" onClick={() => {
                            this.props.history.push("/app-home/release")
                            this.props.ReleaseProjectGoBack(release)
                        }}><i className="glyphicon glyphicon-arrow-left"></i></button>
                    </div>
                    <div className="col-md-3">
                        <div className="releaseTitle">
                            <span
                                title={release && release.project && release.project.name ? release.project.name : ''}>Project Name</span>
                        </div>
                        <div className="releasecontent">
                            <p>{release && release.project && release.project.name ? release.project.name + ' (' + release.name + ')' : ''}</p>
                        </div>
                    </div>
                    <div
                        className={isManager ? "col-md-2" : "col-md-3"}>
                        <div className="releaseTitle">
                            <span>Start Date</span>
                        </div>
                        <div className="releasecontent">
                            <p>{release && release && release.devStartDate ? momentTZ.utc(release.devStartDate).format("DD-MM-YYYY") : ''}</p>
                        </div>
                    </div>
                    <div
                        className={isManager ? "col-md-2" : "col-md-3"}>
                        <div className="releaseTitle">
                            <span>End Date</span>
                        </div>
                        <div className="releasecontent">
                            <p>{release && release.devEndDate ? momentTZ.utc(release.devEndDate).format("DD-MM-YYYY") : ''}</p>
                        </div>
                    </div>
                    <div className="col-md-2">
                        <div className="releaseTitle">
                            <span>Release Date</span>
                        </div>
                        <div className="releasecontent">
                            <p>{release && release.clientReleaseDate ? momentTZ.utc(release.clientReleaseDate).format("DD-MM-YYYY") : ''}</p>
                        </div>
                    </div>

                    {isManager ?
                        <div className="col-md-2">
                            <ul className="ordered-button">
                                <li>
                                    <img onClick={() => {
                                        this.props.openUpdateReleaseDatesForm(release)
                                    }} src={'/images/edit_date.png'}></img>
                                </li>
                                <li>
                                    <img onClick={() => {
                                        this.props.openUpdateReleaseForm(release)
                                    }} src={'/images/edit_release.png'}></img>
                                </li>
                            </ul>

                        </div> : null
                    }

                    {/*
                    <div className=" col-md-2 releasefileoption">
                        <ul className="list-unstyled">
                            <li><a href="#"> <i className="fa fa-file-pdf-o"></i></a></li>
                            <li><a href="#"> <i className="fa fa-file-word-o"></i></a></li>
                            <li><a href="#"> <i className=" fa fa-file-excel-o"></i></a></li>
                        </ul>
                    </div>
                    */}

                </div>
                <div className="col-md-12">
                    <div className="col-md-12">
                        <div className="col-md-2 pad ">
                            <div className="releaseTeamManager"><span>Manager</span>
                            </div>
                            <div className="estimationuser tooltip"><span>M</span>
                                <p className="tooltiptext">{release && release.manager && release.manager.firstName ? release.manager.firstName : ''}</p>
                            </div>
                        </div>
                        <div className="col-md-2 pad ">
                            <div className="releaseTeamLeader"><span> Leader</span>
                            </div>
                            <div className="estimationuser tooltip"><span>L</span>
                                <p className="tooltiptext">{release && release.leader && release.leader.firstName ? release.leader.firstName : ''}</p>
                            </div>
                        </div>
                        <div className="col-md-5 pad ">
                            <div className="releaseTeam"><span>Team</span>
                            </div>
                            {
                                release && release.team && Array.isArray(release.team) && release.team.length ? release.team.map((teamMember, index) =>
                                    <div key={"teamMember" + index} className="estimationuser tooltip">
                                        <span>T{index + 1}</span>
                                        <p className="tooltiptext">{teamMember ? teamMember.name : ''}</p>
                                    </div>) : <span></span>
                            }

                        </div>
                        <div className="col-md-3">
                            <div className="col-md-6  releaseClock  releaseProjectPlannedHours">
                                <i className="fa fa-clock-o "
                                   title="Estimated Hours"></i><b>{release.plannedStats ? release.plannedStats.sumEstimatedHours : ''}
                                Hrs</b>
                            </div>
                            <div className="col-md-6  releaseClock releasePlannedHrs releaseProjectPlannedHours">
                                <i className="fa fa-clock-o "
                                   title="Planned Hours"></i><b>{release.plannedStats ? release.plannedStats.sumPlannedHours : ''}
                                Hrs</b>
                            </div>
                        </div>

                    </div>
                    <div className="col-md-12 pad">
                        <div className="clearfix pad">
                            <ul className="nav nav-tabs">
                                <li className={selectedTab === SC.RELEASE_DASHBOARD_TAB ? 'active' : ''}>
                                    <a
                                        data-toggle="tab"
                                        className={selectedTab === SC.RELEASE_DASHBOARD_TAB ? "btn  btn-link btn-size" : "btn  btn-link btn-size"}
                                        onClick={() => {
                                            this.props.tabSelected(SC.RELEASE_DASHBOARD_TAB)
                                        }}>Dashboard
                                    </a>
                                </li>
                                {
                                    (isManager || isLeader) &&
                                    <li className={selectedTab === SC.RELEASE_PLAN_TAB ? 'active' : ''}>
                                        <a
                                            data-toggle="tab"
                                            className={selectedTab === SC.RELEASE_PLAN_TAB ? "btn  btn-link btn-size" : "btn  btn-link btn-size"}
                                            onClick={() => {
                                                this.props.tabSelected(SC.RELEASE_PLAN_TAB)
                                            }}>Release Plans
                                        </a>
                                    </li>
                                }
                                {
                                    (isManager || isLeader) &&
                                    <li className={selectedTab === SC.RELEASE_WARNINGS_TAB ? 'active' : ''}>
                                        <a
                                            data-toggle="tab"
                                            className={selectedTab === SC.RELEASE_WARNINGS_TAB ? "btn  btn-link btn-size" : "btn  btn-link btn-size"}
                                            onClick={() => {
                                                this.props.tabSelected(SC.RELEASE_WARNINGS_TAB)
                                            }}>Warnings
                                        </a>
                                    </li>
                                }
                                {
                                    (isManager || isLeader) &&
                                    <li className={selectedTab === SC.RELEASE_TASK_PLANS_TAB ? 'active' : ''}>
                                        <a
                                            data-toggle="tab"
                                            className={selectedTab === SC.RELEASE_TASK_PLANS_TAB ? "btn btn-link btn-size " : "btn btn-link btn-size "}
                                            onClick={() => {
                                                this.props.tabSelected(SC.RELEASE_TASK_PLANS_TAB)
                                            }}>Task Plans
                                        </a>
                                    </li>
                                }
                                {
                                    (isManager || isLeader) &&
                                    <li className={selectedTab === SC.RELEASE_REPORT_TAB ? 'active' : ''}>
                                        <a
                                            data-toggle="tab"
                                            className={selectedTab === SC.RELEASE_REPORT_TAB ? "btn btn-link btn-size " : "btn btn-link btn-size "}
                                            onClick={() => {
                                                this.props.tabSelected(SC.RELEASE_REPORT_TAB)
                                            }}>Task Report
                                        </a>
                                    </li>
                                }
                            </ul>
                        </div>
                    </div>
                </div>
                {selectedTab === SC.RELEASE_DASHBOARD_TAB && <ReleaseDashboardSectionContainer release={release}/>}
                {(isManager || isLeader) && selectedTab === SC.RELEASE_PLAN_TAB &&
                <ReleasePlanListContainer release={release}/>}
                {(isManager || isLeader) && selectedTab === SC.RELEASE_WARNINGS_TAB &&
                <WarningListContainer release={release}/>}
                {(isManager || isLeader) && selectedTab === SC.RELEASE_TASK_PLANS_TAB &&
                <TaskPlanListContainer release={release}/>}
                {(isManager || isLeader) && selectedTab === SC.RELEASE_REPORT_TAB &&
                <TaskReportListContainer release={release}/>}
            </div>
        )
    }
}

export default withRouter(ReleasePlanSection)
