import React, {Component} from 'react'
import {BootstrapTable, TableHeaderColumn} from 'react-bootstrap-table'
import {withRouter} from 'react-router-dom'
import * as SC from '../../../server/serverconstants'
import moment from 'moment'
import {TaskReportDateNavBarContainer} from '../../containers'
import {CopyToClipboard} from "react-copy-to-clipboard";

class TaskReportList extends Component {

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
    }

    componentDidMount() {
        //this.props.getAllTaskReports(this.props.release)
    }

    taskNameHover(cell, row, rowIndex, colIndex) {
        console.log("taskNameHover()", cell, row)
        if (cell && cell.name)
            return cell.name
        return ''
        }

    formatTaskName(task, row) {
        let taskName = '', color = ''
        if (task) {
            taskName = task.name
            if (row.iterationType == SC.ITERATION_TYPE_PLANNED)
                color = '#4172c1'
            else if (row.iterationType == SC.ITERATION_TYPE_UNPLANNED)
                color = '#e52d8c'
    }

        return <div>
            <CopyToClipboard text={taskName} onCopy={() => this.props.showNotification('Task name copied successfully!!!')}>
                <button id='copy' className="fa fa-copy pull-left btn btn-custom" type="button">
                </button>
            </CopyToClipboard>
            <span style={{color: color}} onClick={() => {
                this.props.taskPlanSelected(row).then(json => {
                    if (json.success) {
                        this.props.history.push('/app-home/task-report-detail')
                        this.props.showTaskDetailPage()
        }
                    return json
                })
            }}>{taskName}</span>
        </div>
    }

    formatTaskDescription(report) {
        console.log("get the task Description", report.description)
        if (report)
            return <div>
                <CopyToClipboard text={report.description} onCopy={() => this.props.showNotification('Report description text copied successfully!!!')}>
                    <button id='copy' className="fa fa-copy pull-left btn btn-custom" type="button">
                    </button>
                </CopyToClipboard>
                {report.description}
            </div>
        return ''
    }

    reportDescriptionHover(cell, row, rowIndex, colIndex) {
        console.log("taskNameHover()", cell, row)
        if (cell && cell.description)
            return cell.description
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
            return moment(row).format("DD-MM-YYYY")
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

    formatPlanningDate(dateString) {
        if (dateString) {
            return moment(dateString, SC.DATE_FORMAT).format(SC.DATE_DISPLAY_FORMAT)
            //return row
        }
        return ''
    }

    formatReportedOnDate(report) {
        if (report && report.reportedOnDate) {
            return moment(report.reportedOnDate).format(SC.DATE_TIME_FORMAT)
        }
        return ''
    }

    formatDeveloperName(employee) {
        if (employee)
            return employee.name
        return ''
    }



    /*onRowClick(row, second, third) {
        console.log("second is ", second)
        console.log("third is ", third)
        this.props.taskPlanSelected(row).then(json => {
            if (json.success) {
                this.props.history.push('/app-home/task-report-detail')
                this.props.showTaskDetailPage()
            }
            return json
        })
    }*/

    formatViewButton(cell, row, enumObject, rowIndex) {
        return (<button className=" btn btn-custom " type="button" onClick={() => {
                this.props.taskPlanSelected(row).then(json => {
                    if (json.success) {
                        this.props.history.push('/app-home/task-report-detail')
                        this.props.showTaskDetailPage()
                    }
                    return json
                })
            }}>
                <i className="fa fa-eye"></i>
            </button>
        )
    }

    render() {
        const {reports, screenHeight} = this.props
        let tableHeight = screenHeight - 335

        console.log("reports------------------", reports)
        console.log("expandDescription------------------", this.props.expandDescription)
        return (
            <div>
                <div>
                    <TaskReportDateNavBarContainer/>
                </div>
                {this.props.expandDescription ?
                    <div className="col-md-12 wrapTextTable">
                        <BootstrapTable options={this.options} data={reports}
                                        multiColumnSearch={true}
                                        search={false}
                                        striped={true}
                                        pagination
                                        hover={true}
                                        height={tableHeight+"px"}>
                            <TableHeaderColumn columnTitle isKey dataField='_id'
                                               hidden={true}>ID
                            </TableHeaderColumn>
                            <TableHeaderColumn columnTitle={this.taskNameHover.bind(this)} width={"20%"}
                                               dataField='task'
                                               dataFormat={this.formatTaskName.bind(this)}>Task Name
                            </TableHeaderColumn>
                            <TableHeaderColumn width={"32%"} columnTitle={this.reportDescriptionHover.bind(this)}
                                               dataField='report'
                                               dataFormat={this.formatTaskDescription.bind(this)}>Reported Description
                            </TableHeaderColumn>
                            <TableHeaderColumn width={"10%"} columnTitle dataField='employee'
                                               dataFormat={this.formatDeveloperName.bind(this)} dataAlign={"center"}>Developer
                            </TableHeaderColumn>
                            <TableHeaderColumn columnTitle width={"10%"} dataField='planningDateString'
                                               dataFormat={this.formatPlanningDate.bind(this)} dataAlign={"center"}>Planning
                                Date
                            </TableHeaderColumn>
                            <TableHeaderColumn columnTitle width={"12%"} dataField='report'
                                               dataFormat={this.formatReportedOnDate.bind(this)} dataAlign={"center"}>Reported On
                            </TableHeaderColumn>
                            <TableHeaderColumn width="8%" columnTitle dataField='report'
                                               dataFormat={this.formatReportedHours.bind(this)} dataAlign={"center"}>Reported
                                </TableHeaderColumn>
                            <TableHeaderColumn width="8%" columnTitle dataField='report'
                                               dataFormat={this.formatReportedStatus.bind(this)} dataAlign={"center"}>Status
                            </TableHeaderColumn>

                        </BootstrapTable>
                    </div> :
                    <div className="col-md-12 ">
                        <BootstrapTable options={this.options} data={reports}
                                        multiColumnSearch={true}
                                        search={false}
                                        striped={true}
                                        pagination
                                        hover={true}
                                        height={tableHeight+"px"}>
                            <TableHeaderColumn columnTitle isKey dataField='_id'
                                               hidden={true}>ID
                            </TableHeaderColumn>
                            <TableHeaderColumn columnTitle={this.taskNameHover.bind(this)} width={"15%"}
                                               dataField='task'
                                               dataFormat={this.formatTaskName.bind(this)}>Task Name
                            </TableHeaderColumn>
                            <TableHeaderColumn width={"25%"} columnTitle={this.reportDescriptionHover}
                                               dataField='report'
                                               dataFormat={this.formatTaskDescription.bind(this)}>Task Description
                            </TableHeaderColumn>
                            <TableHeaderColumn width={"14%"} columnTitle dataField='employee'
                                               dataFormat={this.formatDeveloperName.bind(this)} dataAlign={"center"}>Developer
                            </TableHeaderColumn>
                            <TableHeaderColumn columnTitle width={"10%"} dataField='planningDateString'
                                               dataFormat={this.formatPlanningDate.bind(this)} dataAlign={"center"}>Planned On
                            </TableHeaderColumn>
                            <TableHeaderColumn columnTitle width={"12%"} dataField='report'
                                               dataFormat={this.formatReportedOnDate.bind(this)} dataAlign={"center"}>Reported On
                            </TableHeaderColumn>
                            <TableHeaderColumn columnTitle width={"8%"} dataField='planning'
                                               dataFormat={this.formatPlannedHours.bind(this)} dataAlign={"center"}>Planned

                            </TableHeaderColumn>
                            <TableHeaderColumn width="8%" columnTitle dataField='report'
                                               dataFormat={this.formatReportedHours.bind(this)} dataAlign={"center"}>Reported
                                </TableHeaderColumn>
                            <TableHeaderColumn width="8%" columnTitle dataField='report'
                                               dataFormat={this.formatReportedStatus.bind(this)} dataAlign={"center"}>Status
                            </TableHeaderColumn>
                            <TableHeaderColumn width="6%" dataField='button'
                                               dataFormat={this.formatViewButton.bind(this)}>View
                            </TableHeaderColumn>

                        </BootstrapTable>
                    </div>}
            </div>
        )
    }
}

export default withRouter(TaskReportList)
