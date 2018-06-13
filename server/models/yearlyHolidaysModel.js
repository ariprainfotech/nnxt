import mongoose from 'mongoose'
import _ from 'lodash'
import momentTZ from 'moment-timezone'
import * as EC from '../errorcodes'
import * as SC from '../serverconstants'
import * as U from "../utils"
import AppError from '../AppError'


mongoose.Promise = global.Promise

let yearlyHolidaysSchema = mongoose.Schema({

    calendarYear: {type: String, required: [true, "Holiday Calendar Year is required"]},
    totalCalendarLeave: {type: Number, default: 15},
    casualLeave: {type: Number, default: 15},
    paternityLeave: {type: Number, default: 5},
    maternityLeave: {type: Number, default: 45},
    festivalLeave: {type: Number, default: 2},
    marriageLeave: {type: Number, default: 7},
    officialHolidays: {type: Number, default: 10},
    maxCLPerMonth: {type: Number, default: 3},
    permittedContinuousLeave: {type: Number, default: 3},
    holidaysInMonth: [
        {
            month: {type: Number, default: 0},
            monthName: {type: String, required: [true, "Month name is required"]}
        }
    ],
    holidays: [
        {
            monthNo: {type: Number, default: 0},
            holidayName: {type: String, required: [true, "Holiday name is required"]},
            description: String,
            holidayType: [{
                type: String,
                enum: SC.HOLIDAY_TYPE_LIST
            }],
            date: {type: Date, required: true},
            dateString: {type: String, required: true}
        }
    ]
})

yearlyHolidaysSchema.statics.getAllHolidayYearsFromServer = async (loggedInUser) => {
    if (!U.userHasRole(loggedInUser, SC.ROLE_ADMIN) && !U.userHasRole(loggedInUser, SC.ROLE_SUPER_ADMIN)) {
        throw new AppError(" Only admin and super admin can see holidays", EC.ACCESS_DENIED, EC.HTTP_FORBIDDEN)
    }

    return await YearlyHolidaysModel.find({}, {
        calendarYear: 1
    }).exec()

}

yearlyHolidaysSchema.statics.getAllHolidaysOfYearFromServer = async (year, loggedInUser) => {
    if (!U.userHasRole(loggedInUser, SC.ROLE_ADMIN) && !U.userHasRole(loggedInUser, SC.ROLE_SUPER_ADMIN)) {
        throw new AppError(" Only admin and super admin can see holidays", EC.ACCESS_DENIED, EC.HTTP_FORBIDDEN)
    }

    let yearlyHoliday = await YearlyHolidaysModel.findOne({
        "calendarYear": year
    }, {
        holidays: 1
    }).exec()
    return yearlyHoliday && yearlyHoliday.holidays ? yearlyHoliday.holidays : []
}

yearlyHolidaysSchema.statics.getAllYearlyHolidaysBaseDateToEnd = async (startDateString, endDateString, loggedInUser) => {

    let startDateMoment = U.dateInUTC(startDateString)
    //  startDateString = startDateMoment.clone().toDate()
    let endDateMoment = U.dateInUTC(endDateString)
    //   endDateString = endDateMoment.clone().toDate()
    if (!startDateMoment || !endDateMoment)
        throw new AppError("conversionFailed", EC.BAD_ARGUMENTS, EC.HTTP_BAD_REQUEST)
    return await YearlyHolidaysModel.find({
        "holidays.date": {$gte: startDateMoment.clone().toDate(), $lte: endDateMoment.clone().toDate()}
    }).exec()
}


yearlyHolidaysSchema.statics.createHolidayYear = async holidayYear => {
    //   console.log("holidayYear before", holidayYear)
    if (!holidayYear.calendarYear || _.isEmpty(holidayYear.calendarYear))
        throw new AppError("Calendar Year is required to save Holidays.", EC.BAD_ARGUMENTS, EC.HTTP_BAD_REQUEST)

    let count = await YearlyHolidaysModel.count({calendarYear: holidayYear.calendarYear})
    if (count !== 0)
        throw new AppError("Calendar year already exists, please edit that or use different calendar year.", EC.ALREADY_EXISTS, EC.HTTP_BAD_REQUEST)

    holidayYear.holidays = holidayYear.holidays.map(h => {
        let toDate = new Date(h.date)
        let toMoment = U.dateInUTC(toDate)
        return Object.assign({}, h, {
            date: toMoment.toDate(),
            dateString: toMoment
        })
    })
    //  console.log("holidayYear after ", holidayYear)
    return await YearlyHolidaysModel.create(holidayYear)
}


yearlyHolidaysSchema.statics.createHoliday = async holidayObj => {
    var validation = {
        "holidayName": "",
        "dateString": "",
        "holidayType": "",
        "description": "",
    }

    let holidayDate = U.dateInUTC(holidayObj.dateString)

    //count month to check month is previously created for this month
    let calendarYear = holidayDate.getFullYear()
    let calendarMonth = holidayDate.getMonth()
    let month = SC.MONTHS_WITH_MONTH_NUMBER.find(m => m.number == Number(calendarMonth))
    console.log("month", month)
    let holidayYear = await YearlyHolidaysModel.findOne({
        "calendarYear": calendarYear
    })
    let holidayYearInput = {
        calendarYear: calendarYear
    }

    let holidayMonthInput = {
        month: month.number,
        monthName: month.name
    }
    let holidayDateInput = {
        monthNo: month.number,
        holidayName: holidayObj.holidayName,
        description: holidayObj.description,
        holidayType: holidayObj.holidayType,
        date: holidayDate,
        dateString: holidayObj.dateString
    }

    if (holidayYear) {
        let holidayMonthIndex = holidayYear.holidaysInMonth && Array.isArray(holidayYear.holidaysInMonth) && holidayYear.holidaysInMonth.length ?
            holidayYear.holidaysInMonth.findIndex(hm => hm.month == Number(calendarMonth)) : -1
        let holidayDateIndex = holidayYear.holidays && Array.isArray(holidayYear.holidays) && holidayYear.holidays.length ?
            holidayYear.holidays.findIndex(hd => U.momentInUTC(holidayObj.dateString).isSame(U.momentInUTC(hd.dateString))) : -1
        if (holidayMonthIndex == -1 && holidayDateIndex == -1) {
            // push to month and date both
            console.log("holidayDateInput bk2", holidayDateInput)
            console.log("holidayMonthInput bk2", holidayMonthInput)
            holidayYear.holidaysInMonth = [...holidayYear.holidaysInMonth, holidayMonthInput]
            holidayYear.holidays = [...holidayYear.holidays, holidayDateInput]
        } else if (holidayDateIndex == -1) {
            // push to date only
            console.log("holidayDateInput bk3", holidayDateInput)
            holidayYear.holidays = [...holidayYear.holidays, holidayDateInput]
        } else {
            console.log("bk4", holidayDateInput)
            throw new AppError("Calendar Date already inserted, please create another date.", EC.ALREADY_EXISTS, EC.HTTP_BAD_REQUEST)
        }
        return await holidayYear.save()
    } else {
        holidayYearInput.holidaysInMonth = [holidayMonthInput]
        holidayYearInput.holidays = [holidayDateInput]
        console.log("holidayYearInput bk3", holidayYearInput)
        return await YearlyHolidaysModel.create(holidayYearInput)
    }
}


yearlyHolidaysSchema.statics.updateHolidayYear = async holidayYearInput => {
    // console.log("holidayYearInput", holidayYearInput)
    if (_.isEmpty(holidayYearInput.calendarYear))
        throw new AppError("Calendar Year is required to save Holidays.", EC.BAD_ARGUMENTS, EC.HTTP_BAD_REQUEST)

    let count = await YearlyHolidaysModel.count({calendarYear: holidayYearInput.calendarYear})
    if (count == 0)
        throw new AppError("Calendar year not exists, please create that or use different calendar year.", EC.NOT_EXISTS, EC.HTTP_BAD_REQUEST)


    let holidayYear = await YearlyHolidaysModel.find({
        "calendarYear": holidayYearInput.calendarYear
    })

    holidayYear.holidaysInMonth[0].push(holidayYearInput.holidaysInMonth[0])
    holidayYear.holidays[0].push(holidayYearInput.holidays[0])

    return await holidayYear.save
}

yearlyHolidaysSchema.statics.addHolidayToYear = async (holidayYearID, holidayObj) => {
    let holidayYear = await YearlyHolidaysModel.findById(holidayYearID)
    if (!holidayYear)
        throw new AppError("Invalid holiday year.", EC.BAD_ARGUMENTS, EC.HTTP_BAD_REQUEST)

    if (_.isEmpty(holidayObj.holidayName))
        throw new AppError("Holiday name is required to save Holiday.", EC.BAD_ARGUMENTS, EC.HTTP_BAD_REQUEST)

    if (_.isEmpty(holidayObj.date))
        throw new AppError("Holiday date is required to save Holiday.", EC.BAD_ARGUMENTS, EC.HTTP_BAD_REQUEST)

    holidayYear.holidays.push(holidayObj);
    let queryResponse = await holidayYear.save()
    return queryResponse.holidays[queryResponse.holidays.length - 1];

}

yearlyHolidaysSchema.statics.updateHolidayToYear = async (holidayYearID, holidayObj) => {


}
yearlyHolidaysSchema.statics.deleteHolidayFromYear = async (holidayYearID, holidayObj) => {
    let holidayYear = await YearlyHolidaysModel.findById(holidayYearID)

    if (!holidayYear)
        throw new AppError("Invalid holiday year.", EC.BAD_ARGUMENTS, EC.HTTP_BAD_REQUEST)

    if (_.isEmpty(holidayObj._id))
        throw new AppError("Holiday id is required to remove Holiday.", EC.BAD_ARGUMENTS, EC.HTTP_BAD_REQUEST)

    await YearlyHolidaysModel.update(
        {_id: holidayYearID},
        {$pull: {holidays: {_id: holidayObj._id}}},
        {multi: false});
    return holidayObj;
    // holidayYear.holidays.pop({_id:holidayObj._id});
}
const YearlyHolidaysModel = mongoose.model("yearlyholidays", yearlyHolidaysSchema)

export default YearlyHolidaysModel


/*
*
*
* {

    "calendarYear": "2018",
    "totalCalendarLeave": 15,
    "casualLeave": 15,
    "paternityLeave": 5,
    "maternityLeave": 45,
    "festivalLeave": 2,
    "marriageLeave": 7,
    "officialHolidays": 10,
    "maxCLPerMonth": 3,
    "permittedContinuousLeave": 3,
    "holidaysInMonth": [
        {
            "month": 0,
            "monthName": "january"
        }
    ],
    "holidays": [
        {
        	"monthNo": 0,
            "holidayName": "Republic Day",
            "description": "Republic Day",
            "holidayType": "Public",
            "date": "Friday, January 26, 2018 12:00:00 AM GMT+05:30"
        }
    ]
}
*/