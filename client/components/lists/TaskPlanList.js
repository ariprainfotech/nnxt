import React, {Component} from 'react'
import {BootstrapTable, TableHeaderColumn} from 'react-bootstrap-table'
import {withRouter} from 'react-router-dom'
import * as SC from '../../../server/serverconstants'
import {ReleaseTaskSearchFormContainer} from '../../containers'
import {TaskPlanDateNavBarContainer} from '../../containers'
import momentTZ from 'moment-timezone'
import {CopyToClipboard} from 'react-copy-to-clipboard';
import {NotificationManager} from "react-notifications";

class TaskPlanList extends Component {

    constructor(props) {
        super(props);
        let sizePerPage = Math.floor((props.screenHeight - 320)/25)

        this.options = {
            sizePerPageList: [{
                text: '6', value: 6
            }, {
                text: '10', value: 10
            }, {
                text: '20', value: 20
            }, {
                text: '50', value: 50
            }],
            sizePerPage,  // which size per page you want to locate as default
            //onRowClick: this.onRowClick.bind(this)
        }

        this.state = {
            value: '',
            copied: false,
        };


    }

    componentDidMount() {
        //this.props.getAllTaskPlans(this.props.release)
    }


    onRowDoubleClick(row) {

    }
    formatDeveloperName(employee) {
        if (employee)
            return employee.name
        return ''
    }

    formatTaskName(task, row) {
        if (task) {
            if (row.iterationType == SC.ITERATION_TYPE_PLANNED)
                return <span style={{color: '#4172c1',cursor:'pointer'}}>{task.name}</span>
            else if (row.iterationType == SC.ITERATION_TYPE_UNPLANNED)
                return <span style={{color: '#e52d8c',cursor:'pointer'}}>{task.name}</span>
            else
                return <span>{task.name}</span>
        }
        return ''
    }

    formatPlannedHours(planning) {
        console.log("Planning---------------", planning)
        if (planning)
            return planning.plannedHours
        return 0
    }

    formatPlannedDate(row) {
        if (row) {
            return momentTZ.utc(row).format(SC.DATE_DISPLAY_FORMAT)
        }
        return ''
    }

    formatReportedStatus(report) {
        if (report)
            return report.status
        return ''
    }

    formatReportedHours(report) {
        if (report)
            return report.reportedHours
        return 0
    }

    formatCopyButton(cell, row, enumObject, rowIndex){
        return (
            <div>
                <CopyToClipboard text={row.description} onCopy={() => this.props.onCopy()}>
                    <button id={row._id} className="fa fa-copy pull-left btn btn-custom" type="button">
                    </button>
                </CopyToClipboard>
            </div>
        )
    }

    formatViewButton(cell, row, enumObject, rowIndex) {

        return (<button className=" btn btn-custom" type="button" onClick={() => {
                this.props.taskPlanSelectedForRelease(row).then(json => {
                    console.log("get the data at the task plan list",json)
                    if (json.success) {
                        console.log("get the data at the task plan list... if ",json)
                        this.props.history.push('/app-home/task-plan-detail')
                        this.props.showTaskDetailPage()
                    }
                    return json
                })
            }}>
                <i className="fa fa-eye"></i>
            </button>
        )
    }


    formatReportDescription(report) {
        if (report)
            return report.description
        return ''
    }

    formatFlags(flags) {
        let flagImageArray = []
        flagImageArray = flags && flags.length ? flags.map((flag, idx) => {
            if (flag === SC.WARNING_UNPLANNED)
                return <img className="div-hover releasePlanFlagImg" key={"unplanned" + idx} src="/images/unplanned.png"
                            title="Unplanned"/>
            else if (flag === SC.WARNING_TOO_MANY_HOURS)
                return <img className="div-hover releasePlanFlagImg" key={"too_many_hours" + idx}
                            src="/images/too_many_hours.png"
                            title="Too Many Hours"/>
            else if (flag === SC.WARNING_EMPLOYEE_ON_LEAVE)
                return <img className="div-hover releasePlanFlagImg" key={"employee-on-leave" + idx}
                            src="/images/employee_on_leave.png"
                            title="Employee On Leave"/>
            else if (flag === SC.WARNING_RELEASE_DATE_MISSED_1)
                return <img className="div-hover releasePlanFlagImg" key={"release_date_missed_1" + idx}
                            src="/images/release_date_missed_1.png"
                            title="Release Date Missed 1"/>
            else if (flag === SC.WARNING_RELEASE_DATE_MISSED_2)
                return <img className="div-hover releasePlanFlagImg" key={"release_date_missed_2" + idx}
                            src="/images/release_date_missed_2.png"
                            title="Release Date Missed 2"/>
            else if (flag === SC.WARNING_RELEASE_DATE_MISSED_3)
                return <img className="div-hover releasePlanFlagImg" key={"release_date_missed_3" + idx}
                            src="/images/release_date_missed_3.png"
                            title="Release Date Missed 3"/>
            else if (flag === SC.WARNING_RELEASE_DATE_MISSED_4)
                return <img className="div-hover releasePlanFlagImg" key={"release_date_missed_4" + idx}
                            src="/images/release_date_missed_4.png"
                            title="Release Date Missed 4"/>
            else if (flag === SC.WARNING_PLANNED_BEYOND_RELEASE_DATE)
                return <img className="div-hover releasePlanFlagImg" key={"planned_beyond_release_date" + idx}
                            src="/images/planned_beyond_release_date.png"
                            title="Planned Beyond Release Date"/>
            else if (flag === SC.WARNING_LESS_PLANNED_HOURS)
                return <img className="div-hover releasePlanFlagImg" key={"less_planned_hours" + idx}
                            src="/images/less_planned_hours.png"
                            title="Less Planned Hours"/>
            else if (flag === SC.WARNING_MORE_PLANNED_HOURS)
                return <img className="div-hover releasePlanFlagImg" key={"more_planned_hours" + idx}
                            src="/images/more_planned_hours.png"
                            title="More Planned Hours"/>
            else if (flag === SC.WARNING_MORE_REPORTED_HOURS_1)
                return <img className="div-hover releasePlanFlagImg" key={"more_reported_hours_1" + idx}
                            src="/images/more_reported_hours_1.png"
                            title="More Reported Hours 1"/>
            else if (flag === SC.WARNING_MORE_REPORTED_HOURS_2)
                return <img className="div-hover releasePlanFlagImg" key={"more_reported_hours_2" + idx}
                            src="/images/more_reported_hours_2.png"
                            title="More Reported Hours 2"/>
            else if (flag === SC.WARNING_MORE_REPORTED_HOURS_3)
                return <img className="div-hover releasePlanFlagImg" key={"more_reported_hours_3" + idx}
                            src="/images/more_reported_hours_3.png"
                            title="More Reported Hours 3"/>
            else if (flag === SC.WARNING_MORE_REPORTED_HOURS_4)
                return <img className="div-hover releasePlanFlagImg" key={"more_reported_hours_4" + idx}
                            src="/images/more_reported_hours_4.png"
                            title="More Reported Hours 4"/>
            else if (flag === SC.WARNING_HAS_UNREPORTED_DAYS)
                return <img className="div-hover releasePlanFlagImg" key={"has-unreported-days" + idx}
                            src="/images/has_unreported_days.png"
                            title="Has Unreported Days"/>
            else if (flag === SC.WARNING_UNREPORTED)
                return <img className="div-hover releasePlanFlagImg" key={"unreported" + idx}
                            src="/images/unreported.png"
                            title="Unreported"/>
            else if (flag === SC.WARNING_PENDING_ON_END_DATE)
                return <img className="div-hover releasePlanFlagImg" key={"pending-on-enddate" + idx}
                            src="/images/pending-on-enddate.png"
                            title="Pending On Enddate"/>
            else if (flag === SC.WARNING_COMPLETED_BEFORE_END_DATE)
                return <img className="div-hover releasePlanFlagImg" key={"completed-before-enddate" + idx}
                            src="/images/completed_before_enddate.png"
                            title="Completed Before Enddate"/>
            else if (flag === SC.WARNING_EMPLOYEE_ASK_FOR_LEAVE)
                return <img className="div-hover releasePlanFlagImg" key={"employee-ask-for-leave"}
                            src="/images/employee-ask-for-leave.png"
                            title="Employee Ask For Leave"/>
            else return ''
        }) : null
        return <span>{flagImageArray}</span>

    }


    render() {
        const {taskPlans, screenHeight} = this.props
        console.log("taskPlans------------------", taskPlans, this.props.expandDescription)

        let tableHeight = screenHeight - 335

        return (
            <div>
                <div>
                    <TaskPlanDateNavBarContainer/>
                </div>

                {this.props.expandDescription ?
                    <div
                        className={"col-md-12 wrapTextTable"}>
                        <BootstrapTable options={this.options} data={taskPlans}
                                        search={false}
                                        striped={true}
                                        pagination
                                        hover={true}
                                        height={tableHeight+"px"}>
                            <TableHeaderColumn columnTitle isKey dataField='_id'
                                               hidden={true}>ID
                            </TableHeaderColumn>
                            <TableHeaderColumn columnTitle width={"8%"} dataField='planningDate'
                                               dataFormat={this.formatPlannedDate.bind(this)}>Planning
                                Date
                            </TableHeaderColumn>
                            <TableHeaderColumn columnTitle width={"20%"} dataField='task'
                                               dataFormat={this.formatTaskName.bind(this)}>Tasks
                            </TableHeaderColumn>
                            <TableHeaderColumn width={"14%"} columnTitle dataField='employee'
                                               dataFormat={this.formatDeveloperName.bind(this)}>Developer
                            </TableHeaderColumn>

                            <TableHeaderColumn columnTitle width={"8%"} dataField='report'
                                               dataFormat={this.formatReportedHours.bind(this)} dataAlign={"right"}>Reported
                            </TableHeaderColumn>

                            <TableHeaderColumn columnTitle width={"8%"} dataField='report'
                                               dataFormat={this.formatReportedStatus.bind(this)} dataAlign={"center"}>Status
                            </TableHeaderColumn>

                            <TableHeaderColumn columnTitle width={"42%"} dataField='description'>Day Requirement
                            </TableHeaderColumn>




                        </BootstrapTable>
                    </div> :
                    <div className={"col-md-12"}>
                        <BootstrapTable options={this.options} data={taskPlans}
                                        search={false}
                                        striped={true}
                                        pagination
                                        hover={true}
                                        height={tableHeight+"px"}>
                            <TableHeaderColumn columnTitle isKey dataField='_id'
                                               hidden={true}>ID
                            </TableHeaderColumn>
                            <TableHeaderColumn columnTitle width={"8%"} dataField='planningDate'
                                               dataFormat={this.formatPlannedDate.bind(this)}>Planning
                                Date
                            </TableHeaderColumn>
                            <TableHeaderColumn columnTitle width={"20%"} dataField='task'
                                               dataFormat={this.formatTaskName.bind(this)}>Tasks
                            </TableHeaderColumn>
                            <TableHeaderColumn width={"14%"} columnTitle dataField='employee'
                                               dataFormat={this.formatDeveloperName.bind(this)}>Developer
                            </TableHeaderColumn>
                            <TableHeaderColumn width="14%" dataField='flags'
                                               dataFormat={this.formatFlags.bind(this)}>
                                Flag</TableHeaderColumn>

                            <TableHeaderColumn columnTitle width={"8%"} dataField='planning'
                                               dataFormat={this.formatPlannedHours.bind(this)} dataAlign={"right"}>Planned
                            </TableHeaderColumn>
                            <TableHeaderColumn columnTitle width={"8%"} dataField='report'
                                               dataFormat={this.formatReportedHours.bind(this)} dataAlign={"right"}>Reported
                            </TableHeaderColumn>
                            <TableHeaderColumn className="description" columnTitle width={"20%"} dataField='description'>Day Requirement
                            </TableHeaderColumn>
                            <TableHeaderColumn columnTitle width={"8%"} dataField='report'
                                               dataFormat={this.formatCopyButton.bind(this)} dataAlign={"center"}>Copy
                            </TableHeaderColumn>
                            <TableHeaderColumn width="6%" dataField='button'
                                               dataFormat={this.formatViewButton.bind(this)}>View
                            </TableHeaderColumn>
                        </BootstrapTable>
                    </div>
                }
            </div>
        )
    }
}

export default withRouter(TaskPlanList)
