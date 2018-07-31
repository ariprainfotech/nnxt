import React, {Component} from 'react'
import moment from 'moment'
import momentLocalizer from 'react-widgets-moment'
import momentTZ from 'moment-timezone'
import * as SC from '../../../server/serverconstants'

moment.locale('en')
momentLocalizer()

class ReleaseDevelopersSchedules extends React.Component {
    constructor(props) {
        super(props);
    }

    componentDidMount() {
        this.props.getEmployeeSettings()
    }

    render() {

        const {schedules, employeeSetting, from} = this.props
        let fromString = moment(from).format(SC.DATE_FORMAT)
        let fromMoment = momentTZ.tz(fromString, SC.DATE_FORMAT, SC.UTC_TIMEZONE).hour(0).minute(0).second(0).millisecond(0)
        let startMoment = momentTZ.tz(fromString, SC.DATE_FORMAT, SC.UTC_TIMEZONE).hour(0).minute(0).second(0).millisecond(0)
        let toMoment = fromMoment.clone().add(6, 'days')
        let weekArray = []
        while (startMoment.isSameOrBefore(toMoment)) {
            weekArray.push(startMoment.clone())
            startMoment = startMoment.clone().add(1, 'days')
        }
        return <div>
            <div key={'schedule_1'}
                 className="col-md-12 releaseSchedule">
                <div className="repository releaseDevInfo">
                    <div className="releaseDevHeading">
                        <h5>Saurabh Chouhan</h5>
                        <i className="glyphicon glyphicon-resize-full pull-right"></i>
                        <span
                            className="pull-right">July</span>
                    </div>
                    <div className={"schCalendar"}>
                        <div className="schCalendarDayRow">
                            <div key={'day_1'} className="schCalendarCell">
                                <h5>Mon</h5>
                            </div>
                            <div key={'day_1'} className="schCalendarCell">
                                <h5>Tue</h5>
                            </div>
                            <div key={'day_1'} className="schCalendarCell">
                                <h5>Wed</h5>
                            </div>
                            <div key={'day_1'} className="schCalendarCell">
                                <h5>Thu</h5>
                            </div>
                            <div key={'day_1'} className="schCalendarCell">
                                <h5>Fri</h5>
                            </div>
                            <div key={'day_1'} className="schCalendarCell">
                                <h5>Sat</h5>
                            </div>
                            <div key={'day_1'} className="schCalendarCell">
                                <h5>Sun</h5>
                            </div>

                        </div>
                        <div className="schCalendarDayRow">
                            <div key={'day_1'} className="schCalendarCell">
                                <h5>30</h5>
                                <div className="releaseEmployee">
                                                        <span className={"schCalendarHour"} style={{
                                                            backgroundColor: '#76c0e2'
                                                        }}>12</span>
                                </div>
                            </div>
                            <div key={'day_1'} className="schCalendarCell">
                                <h5>2</h5>
                                <div className="releaseEmployee" >
                                                        <span className={"schCalendarHour"} style={{
                                                            backgroundColor: 'green'
                                                        }}>8</span>
                                </div>
                            </div>
                            <div key={'day_1'} className="schCalendarCell">
                                <h5>3</h5>
                                <div className="releaseEmployee" >
                                                        <span style={{
                                                            display: 'inline-block',
                                                            width: '100%',
                                                            textAlign: 'center'
                                                        }}>8</span>
                                </div>
                            </div>
                            <div key={'day_1'} className="schCalendarCell">
                                <h5>4</h5>
                                <div className="releaseEmployee" >
                                                        <span style={{
                                                            display: 'inline-block',
                                                            width: '100%',
                                                            textAlign: 'center'
                                                        }}>8</span>
                                </div>
                            </div>
                            <div key={'day_1'} className="schCalendarCell">
                                <h5>5</h5>
                                <div className="releaseEmployee" >
                                                        <span style={{
                                                            display: 'inline-block',
                                                            width: '100%',
                                                            textAlign: 'center'
                                                        }}>8</span>
                                </div>
                            </div>
                            <div key={'day_1'} className="schCalendarCell">
                                <h5>6</h5>
                                <div className="releaseEmployee" >
                                                        <span style={{
                                                            display: 'inline-block',
                                                            width: '100%',
                                                            textAlign: 'center'
                                                        }}>8</span>
                                </div>
                            </div>
                            <div key={'day_1'} className="schCalendarCell">
                                <h5>7</h5>
                                <div className="releaseEmployee" >
                                                        <span style={{
                                                            display: 'inline-block',
                                                            width: '100%',
                                                            textAlign: 'center'
                                                        }}>8</span>
                                </div>
                            </div>

                        </div>
                        <div className="schCalendarDayRow">
                            <div key={'day_1'} className="schCalendarCell">
                                <h5>1</h5>
                                <div className="releaseEmployee" >
                                                        <span style={{
                                                            display: 'inline-block',
                                                            width: '100%',
                                                            textAlign: 'center'
                                                        }}>8</span>
                                </div>
                            </div>
                            <div key={'day_1'} className="schCalendarCell">
                                <h5>2</h5>
                                <div className="releaseEmployee" >
                                                        <span style={{
                                                            display: 'inline-block',
                                                            width: '100%',
                                                            textAlign: 'center'
                                                        }}>8</span>
                                </div>
                            </div>
                            <div key={'day_1'} className="schCalendarCell">
                                <h5>3</h5>
                                <div className="releaseEmployee" >
                                                        <span style={{
                                                            display: 'inline-block',
                                                            width: '100%',
                                                            textAlign: 'center'
                                                        }}>8</span>
                                </div>
                            </div>
                            <div key={'day_1'} className="schCalendarCell">
                                <h5>4</h5>
                                <div className="releaseEmployee" >
                                                        <span style={{
                                                            display: 'inline-block',
                                                            width: '100%',
                                                            textAlign: 'center'
                                                        }}>8</span>
                                </div>
                            </div>
                            <div key={'day_1'} className="schCalendarCell">
                                <h5>5</h5>
                                <div className="releaseEmployee" >
                                                        <span style={{
                                                            display: 'inline-block',
                                                            width: '100%',
                                                            textAlign: 'center'
                                                        }}>8</span>
                                </div>
                            </div>
                            <div key={'day_1'} className="schCalendarCell">
                                <h5>6</h5>
                                <div className="releaseEmployee" >
                                                        <span style={{
                                                            display: 'inline-block',
                                                            width: '100%',
                                                            textAlign: 'center'
                                                        }}>8</span>
                                </div>
                            </div>
                            <div key={'day_1'} className="schCalendarCell">
                                <h5>7</h5>
                                <div className="releaseEmployee">
                                                        <span style={{
                                                            display: 'inline-block',
                                                            width: '100%',
                                                            textAlign: 'center',
                                                            backgroundColor: '#76c0e2'
                                                        }}>8</span>
                                </div>
                            </div>

                        </div>

                    </div>
                </div>
            </div>
        </div>
    }
}

export default ReleaseDevelopersSchedules

/**
 import React, {Component} from 'react'
 import moment from 'moment'
 import momentLocalizer from 'react-widgets-moment'
 import momentTZ from 'moment-timezone'
 import * as SC from '../../../server/serverconstants'

 moment.locale('en')
 momentLocalizer()

 class ReleaseDevelopersSchedules extends React.Component {
    constructor(props) {
        super(props);
    }

    componentDidMount() {
        this.props.getEmployeeSettings()
    }

    render() {

        const {schedules, employeeSetting, from} = this.props
        let fromString = moment(from).format(SC.DATE_FORMAT)
        let fromMoment = momentTZ.tz(fromString, SC.DATE_FORMAT, SC.UTC_TIMEZONE).hour(0).minute(0).second(0).millisecond(0)
        let startMoment = momentTZ.tz(fromString, SC.DATE_FORMAT, SC.UTC_TIMEZONE).hour(0).minute(0).second(0).millisecond(0)
        let toMoment = fromMoment.clone().add(6, 'days')
        let weekArray = []
        while (startMoment.isSameOrBefore(toMoment)) {
            weekArray.push(startMoment.clone())
            startMoment = startMoment.clone().add(1, 'days')
        }
        return <div>
            {
                schedules && schedules.length ? schedules.map((schedule, idx) => {


                        return <div key={'schedule' + idx}
                                    className="col-md-12 releaseSchedule">
                            <div className="repository releaseDevInfo">
                                <div className="releaseDevHeading">
                                    <h5>{schedule.employee && schedule.employee.name ? schedule.employee.name : "Employee"}</h5>
                                    <i className="glyphicon glyphicon-resize-full pull-right"></i>
                                    <span
                                        className="pull-right">{fromMoment.format(SC.DATE_MONTH_FORMAT) + ' to ' + toMoment.format(SC.DATE_MONTH_FORMAT)}</span>
                                </div>
                                <div className="releaseDayRow">
                                    {
                                        weekArray && weekArray.length ? weekArray.map((weekDate, index) => {
                                            let scheduleDay = schedule.days && schedule.days.length ? schedule.days.find(day => momentTZ.tz(day.dateString, SC.DATE_FORMAT, SC.UTC_TIMEZONE).isSame(weekDate)) : undefined
                                            if (scheduleDay && scheduleDay != undefined) {
                                                let color = scheduleDay.plannedHours >= employeeSetting.superBusy ?
                                                    '#dd6c6c'
                                                    : scheduleDay.plannedHours >= employeeSetting.busy ?
                                                        '#91d861'
                                                        : scheduleDay.plannedHours >= employeeSetting.someWhatBusy ?
                                                            '#d645f7'
                                                            : scheduleDay.plannedHours >= employeeSetting.relativelyFree ?
                                                                '#76c0e2'

                                                                : '#e8c392'

                                                return <div key={'day' + index} className="releaseDayCell">
                                                    <h5> {moment(scheduleDay.dateString).format(SC.DATE_HALF_WEAK_MONTH_FORMAT)}</h5>
                                                    <div className="releaseEmployee" style={{backgroundColor: color}}>
                                                        <span style={{
                                                            display: 'inline-block',
                                                            width: '100%',
                                                            textAlign: 'center'
                                                        }}> {scheduleDay.plannedHours}</span>
                                                    </div>
                                                </div>
                                            } else return <div key={'day' + index} className="releaseDayCell">
                                                <h5> {moment(weekDate).format(SC.DATE_HALF_WEAK_MONTH_FORMAT)}</h5>
                                                <div className="releaseEmployee" style={{backgroundColor: '#e8c392'}}>
                                                    <span style={{
                                                        display: 'inline-block',
                                                        width: '100%',
                                                        textAlign: 'center'
                                                    }}> 0</span>
                                                </div>
                                            </div>
                                        }) : null
                                    }
                                </div>
                            </div>
                        </div>
                    }) :
                    <div className="releaseEmployeeMsgText">
                        <label>Employee is not selected</label>
                    </div>
            }
        </div>
    }
}

 export default ReleaseDevelopersSchedules

 **/