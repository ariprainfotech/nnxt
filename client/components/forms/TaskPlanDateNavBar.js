import React, {Component} from 'react'
import {Field, formValueSelector, reduxForm} from 'redux-form'
import {renderDateTimePickerString, renderSelect,} from './fields'
import moment from 'moment'
import momentLocalizer from 'react-widgets-moment'
import {connect} from 'react-redux'
import * as SC from '../../../server/serverconstants'
import momentTZ from "moment-timezone";
import {DATE_FORMAT} from "../../../server/serverconstants";

moment.locale('en')

class TaskPlanDateNavBar extends Component {

    constructor(props) {
        super(props)
        this.state = {
            expandDescription: false
        }

    }

    componentDidMount() {
        // On task plan load view user would be shown tasks of today's day and beyond
        console.log("componentDidMount ", this.props)
        this.props.fetchTasks({
            releaseID: this.props.releaseID,
            startDate: this.props.initialValues.startDate,
            endDate: this.props.initialValues.endDate
        })


        this.handleExpandDescriptionCheckBox = this.handleExpandDescriptionCheckBox.bind(this);
    }

    handleExpandDescriptionCheckBox(event) {
        const target = event.target;
        const value = target.type === 'checkbox' ? target.checked : target.value;
        this.setState({
            expandDescription: value
        })
        this.props.expandDescription(value)
    }


    render() {
        const {handleSubmit, startDate, devStartDate, devEndDate, endDate, releaseID, pristine, submitting, status, flag,developers,developer} = this.props
        let releaseStartMoment = moment(momentTZ.utc(devStartDate).format(DATE_FORMAT))
        let releaseEndMoment = moment(momentTZ.utc(devEndDate).format(DATE_FORMAT))
        let filterStartMoment = startDate ? moment(startDate) : undefined
        let filterEndMoment = endDate ? moment(endDate) : undefined

        let maxStartMoment = filterEndMoment && filterEndMoment.isValid() ? filterEndMoment : releaseEndMoment
        let minEndMoment = filterStartMoment && filterStartMoment.isValid() ? filterStartMoment : releaseStartMoment

        return <form onSubmit={handleSubmit}>
            <div className="col-md-12 planFilterTaskForm">
                <div className="col-md-4">
                    <div className="col-md-6">
                        <Field name="startDate"
                               placeholder={"Start Date"}
                               component={renderDateTimePickerString}
                               onChange={(event, newValue, oldValue) => {
                                   console.log("onChange() ", releaseID, startDate)
                                   this.props.fetchTasks({
                                       releaseID,
                                       startDate: newValue,
                                       endDate,
                                       status,
                                       flag,
                                       developer
                                   })

                               }}
                               showTime={false}
                               min={releaseStartMoment.toDate()}
                               max={maxStartMoment.toDate()}
                               label={" Start Date :"}/>
                    </div>
                    <div className="col-md-6">
                        <Field name="endDate" placeholder={" End Date"} component={renderDateTimePickerString}
                               onChange={(event, newValue, oldValue) => {
                                   this.props.fetchTasks({
                                       releaseID,
                                       startDate,
                                       endDate: newValue,
                                       status,
                                       flag,
                                       developer
                                   })
                               }}
                               showTime={false}
                               min={minEndMoment.toDate()}
                               max={releaseEndMoment.toDate()}
                               label={" End Date :"}/>
                    </div>

                </div>

                <div className="col-md-2">

                    <Field name="status" component={renderSelect} label={"Status"} options={
                        SC.ALL_TASK_STATUS.map((status, idx) =>
                            ({
                                _id: status,
                                name: status
                            })
                        )
                    } onChange={(event, newValue) => {
                        this.props.fetchTasks({
                            releaseID,
                            startDate,
                            endDate,
                            status: newValue,
                            flag,
                            developer
                        })
                    }} noneOptionText='All'/>
                </div>
                <div className="col-md-2">
                    <Field name="flag" component={renderSelect} label={"Flag"} options={
                        SC.ALL_WARNING_NAME_ARRAY.map((status, idx) =>
                            ({
                                _id: status,
                                name: status
                            })
                        )
                    } onChange={(event, newValue, oldValue) => {
                        this.props.fetchTasks({
                            releaseID,
                            startDate,
                            endDate,
                            status,
                            flag: newValue,
                            developer
                        })
                    }} noneOptionText='All'/>
                </div>
                <div className="col-md-2">
                        <Field name="developer" component={renderSelect} label={"Developer"} options={ developers} onChange={(event, newValue, oldValue) => {

                            console.log("get the new value of developer",newValue)
                            this.props.fetchTasks({
                                releaseID,
                                startDate,
                                endDate,
                                status,
                                flag,
                                developer: newValue
                            })
                        }} noneOptionText='All'/>
                </div>

                <div className={"col-md-2 top-label-checkbox"}>
                    <label>
                        Expand Requirement
                    </label>
                    <Field name={"expandDescription"} component="input"
                           type="checkbox"
                           onChange={(event, newValue) => {
                               this.handleExpandDescriptionCheckBox,
                               this.props.expandDescription(newValue)
                           }
                           }
                    />
                </div>
            </div>
        </form>
    }
}

TaskPlanDateNavBar = reduxForm({
    form: 'task-filter'
})(TaskPlanDateNavBar)

const selector = formValueSelector('task-filter')

TaskPlanDateNavBar = connect(
    state => {
        const {releaseId, startDate, endDate, status, flag,developer} = selector(state, 'releaseId', 'startDate', 'endDate', 'status', 'flag','developer')
        console.log("TaskPlanDateNaveBar->connect ", startDate)
        return {
            releaseId,
            startDate,
            endDate,
            status,
            flag,
            developer
        }
    }
)(TaskPlanDateNavBar)


export default TaskPlanDateNavBar