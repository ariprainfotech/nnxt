import React, {Component} from 'react'
import {BootstrapTable, TableHeaderColumn} from 'react-bootstrap-table'
import Dialog from 'react-bootstrap-dialog'
import Parser from 'html-react-parser'
import moment from "moment";
import momentTZ from 'moment-timezone'
import {DATE_TIME_FORMAT, INDIAN_TIMEZONE} from "../../../server/serverconstants";

class NotificationsPage extends Component {
    constructor(props) {
        super(props);
    }

    isExpandableRow() {
        return true;
    }

    expandComponent(row) {
        if (row.message) {
            return <div> {row.message}</div>
        } else {
            return ""
        }
    }

    notificationTextFormated(cell, row, enumObject, rowIndex) {
        if (cell)
            return <div> {Parser(cell)}</div>
        else
            return ""

    }

    dateFormated(cell, row, enumObject, rowIndex) {
        if (cell)
            return moment.utc(cell).format(DATE_TIME_FORMAT)
        else
            return ""
    }

    onClickEmailDeleteSelected(cell, row, rowIndex) {
        this.dialog.show({
            title: "Remove Notification",
            body: "Are you sure want to remove this notification",
            actions: [
                Dialog.DefaultAction('Remove', () => {
                    this.props.deleteNotifications(row._id)
                }, 'btn-custom'),
                Dialog.DefaultAction('Close', () => {
                    this.dialog.hide()
                }, 'btn-custom')
            ],
            bsSize: 'small',
            onHide: (dialog) => {
                this.dialog.hide()
            }
        })
    }


    render() {

        return (<div className="col-md-12">
                <Dialog ref={(el) => {
                    this.dialog = el
                }}/>
            <h4><b>Today's Notifications:</b> <span className="validation-error"> {this.props.todayAllNotifications}</span></h4>
        <BootstrapTable className={"notificationTable"} data={this.props.allNotifications}
                        expandableRow={this.isExpandableRow}
                        expandComponent={this.expandComponent}
                        expandColumnOptions={{expandColumnVisible: true}}>
            <TableHeaderColumn hidden={true} dataField='_id' isKey={true}>Subject</TableHeaderColumn>
            <TableHeaderColumn width="15%" dataField='type'>Type</TableHeaderColumn>
            <TableHeaderColumn width="70%" height="50px" dataField='message'
                               dataFormat={this.notificationTextFormated.bind(this)}>Email Text</TableHeaderColumn>
            <TableHeaderColumn width="15%" dataField='activeOn'
                               dataFormat={this.dateFormated.bind(this)}>Date</TableHeaderColumn>

        </BootstrapTable>
            {/*
                <div className="activitySectionsWrapper">
                    <div className="col-md-12 pad">
                        <div className="col-md-7 pad">
                            <div className="col-md-12">
                                <div className="headerBar">
                                    <span className="pull-left">Assigned To Me</span>
                                    <span className="pull-right"><i className="fa fa-forward"
                                                                    style={{fontSize: '20px'}}></i></span>
                                </div>
                                <div className="contentBar">
                                    <BootstrapTable className={"notificationTable"}>
                                        <TableHeaderColumn dataField='_id' hidden={true} isKey={true}>id</TableHeaderColumn>
                                        <TableHeaderColumn width="30%" dataField='projectName'>Project
                                            Name </TableHeaderColumn>
                                        <TableHeaderColumn width="30%" dataField='taskName'>Task Name</TableHeaderColumn>
                                        <TableHeaderColumn dataField='taskDescription'>Task Description</TableHeaderColumn>
                                    </BootstrapTable>
                                </div>
                            </div>
                            <div className="col-md-12">
                                <br/>
                                <div className="headerBar">
                                    <span className="pull-left">Report</span>
                                    <span className="pull-right"><i className="fa fa-forward"
                                                                    style={{fontSize: '20px'}}></i></span>
                                </div>
                                <div className="contentBar">
                                    <BootstrapTable className={"notificationTable"}>
                                        <TableHeaderColumn dataField='_id' hidden={true} isKey={true}>id</TableHeaderColumn>
                                        <TableHeaderColumn dataField='projectName'>Project Name </TableHeaderColumn>
                                        <TableHeaderColumn dataField='taskName'>Task Name</TableHeaderColumn>
                                        <TableHeaderColumn width="10%" dataField='reportedHours'>R.H.</TableHeaderColumn>
                                        <TableHeaderColumn width="40%" dataField='taskDescription'>Task
                                            Description</TableHeaderColumn>
                                    </BootstrapTable>
                                </div>
                            </div>
                            <div className="col-md-12">
                                <br/>
                                <div className="headerBar">
                                    <span className="pull-left">Planning</span>
                                    <span className="pull-right"><i className="fa fa-forward"
                                                                    style={{fontSize: '20px'}}></i></span>
                                </div>
                                <div className="contentBar">
                                    <BootstrapTable className={"notificationTable"}>
                                        <TableHeaderColumn dataField='_id' hidden={true} isKey={true}>id</TableHeaderColumn>
                                        <TableHeaderColumn width="30%" dataField='projectName'>Project
                                            Name </TableHeaderColumn>
                                        <TableHeaderColumn width="30%" dataField='taskName'>Task Name</TableHeaderColumn>
                                        <TableHeaderColumn width="10%" dataField='plannedHours'>P.H.</TableHeaderColumn>
                                        <TableHeaderColumn dataField='taskDescription'>Task Description</TableHeaderColumn>
                                    </BootstrapTable>
                                </div>
                            </div>
                        </div>
                        <div className="col-md-5 pad">
                            <div className="col-md-12">
                                <div className="headerBar">
                                    <span className="pull-left">Issues</span>
                                    <span className="pull-right"><i className="fa fa-forward"
                                                                    style={{fontSize: '20px'}}></i></span>
                                </div>
                                <div className="contentBar" style={{minHeight: '600px'}}>
                                    <BootstrapTable className={"notificationTable"}>
                                        <TableHeaderColumn dataField='_id' hidden={true} isKey={true}>id</TableHeaderColumn>
                                        <TableHeaderColumn width="30%" dataField='warningIcon'> Warning </TableHeaderColumn>
                                        <TableHeaderColumn width="30%" dataField='projectName'>Project
                                            Name</TableHeaderColumn>
                                        <TableHeaderColumn dataField='taskName'>Task Name</TableHeaderColumn>
                                    </BootstrapTable>
                                </div>
                            </div>
                            <div className="col-md-12">
                                <br/>
                                <div className="headerBar">
                                    <span className="pull-left">Leaves</span>
                                    <span className="pull-right"><i className="fa fa-forward"
                                                                    style={{fontSize: '20px'}}></i></span>
                                </div>
                                <div className="contentBar" style={{minHeight: '300px'}}>
                                    <BootstrapTable className={"notificationTable"}>
                                        <TableHeaderColumn dataField='_id' hidden={true} isKey={true}>id</TableHeaderColumn>
                                        <TableHeaderColumn width="40%" dataField='employeeName'> Employee
                                            Name </TableHeaderColumn>
                                        <TableHeaderColumn width="30%" dataField='date'>Date</TableHeaderColumn>
                                        <TableHeaderColumn dataField='leaveType'>Leave Type</TableHeaderColumn>
                                    </BootstrapTable>
                                </div>
                            </div>
                        </div>
                        <div className="col-md-12">
                            <br/>
                            <div className="headerBar">
                                <span className="pull-left">Activity Stream</span>
                                <span className="pull-right"><i className="fa fa-forward"
                                                                style={{fontSize: '20px'}}></i></span>
                            </div>
                            <div className="contentBarActivityStream">
                                <div className="singleRow">
                                    <div className="col-md-1 activityIcon"
                                         style={{backgroundImage: 'url(../images/user.png)'}}></div>
                                    <div className="col-md-11 activityDetails">
                                        <h3 style={{margin:'0'}}>Here goes the title or heading of activity</h3>
                                        <h4>Here goes the subtitle or sub-heading of activity</h4>
                                        <p>Here goes the activity description which is related to anything like task,
                                            report, planinng or leave etc.</p>
                                        <ul>
                                            <li>Here goes the first item of list is any.</li>
                                            <li>Here goes the second item of list is any.</li>
                                        </ul>
                                        <div className="col-md-4 pad">
                                            <h5>Yesterday at 9:59 AM</h5>
                                        </div>
                                        <div className="col-md-1 pad text-center">
                                            <h5><a href="">Comment</a></h5>
                                        </div>
                                        <div className="col-md-1 pad text-center">
                                            <h5><a href="">Vote</a></h5>
                                        </div>
                                        <div className="col-md-1 pad text-center">
                                            <h5><a href="">Watch</a></h5>
                                        </div>
                                    </div>
                                </div>
                                <div className="singleRow">
                                    <div className="col-md-1 activityIcon"
                                         style={{backgroundImage: 'url(../images/user.png)'}}></div>
                                    <div className="col-md-11 activityDetails">
                                        <h3 style={{margin:'0'}}>Here goes the title or heading of activity</h3>
                                        <h4>Here goes the subtitle or sub-heading of activity</h4>
                                        <p>Here goes the activity description which is related to anything like task,
                                            report, planinng or leave etc.</p>
                                        <ul>
                                            <li>Here goes the first item of list is any.</li>
                                            <li>Here goes the second item of list is any.</li>
                                        </ul>
                                        <div className="col-md-4 pad">
                                            <h5>Yesterday at 9:59 AM</h5>
                                        </div>
                                        <div className="col-md-1 pad text-center">
                                            <h5><a href="">Comment</a></h5>
                                        </div>
                                        <div className="col-md-1 pad text-center">
                                            <h5><a href="">Vote</a></h5>
                                        </div>
                                        <div className="col-md-1 pad text-center">
                                            <h5><a href="">Watch</a></h5>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            */}
    </div>)

    }
    }

    export default NotificationsPage