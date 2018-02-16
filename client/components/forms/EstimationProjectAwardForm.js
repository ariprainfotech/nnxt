import {Field, reduxForm} from 'redux-form'
import React from 'react'
import {renderMultiselect, renderText} from './fields'
import * as logger from '../../clientLogger'

let EstimationProjectAwardForm = (props) => {
    logger.debug(logger.ESTIMATION_PROJECT_AWARD_FORM_RENDER, props)
    const {pristine, submitting,reset} = props
    const {all, Managers, Leaders} = props
    return <form onSubmit={props.handleSubmit}>
        <div className="row">

            <Field name="estimation._id" component="input" type="hidden"/>
            <Field name="_id" component="input" type="hidden"/>

            <div className="col-md-12">
                <div className="col-md-6">
                    <Field name="negotiatedBilledHours" component={renderText} label={"Negotiated Billed Hours:"}/>
                </div>
                <div className="col-md-6">
                    <Field name="nameReleaseVersion" component={renderText} label={"Name (Relese Version):"}/>
                </div>
            </div>
            <div className="col-md-12">
                <div className="col-md-4">
                    <Field name="expectedStartDateForDeveloper:" component={renderText}
                           label={"Expected Start Date For Developer:"}/>
                </div>
                <div className="col-md-4">
                    <Field name="expectedDeveloperReleaseDate" component={renderText}
                           label={"Expected Developer Release Date:"}/>
                </div>
                <div className="col-md-4">
                    <Field name="expectedClientReleaseDate" component={renderText}
                           label={"Expected Client Release Date:"}/>
                </div>
            </div>
            <div className="col-md-12">
                <div className="col-md-6">
                    <Field name="managerOfRelease" component={renderMultiselect} label={"Manager Of Release:"}
                           data={Managers} valueField="_id" textField="name"
                    />
                </div>
                <div className="col-md-6">
                    <Field name="leaderOfRelease" component={renderMultiselect} label={"Leader Of Release:"}
                           data={Leaders} valueField="_id" textField="name"
                    />
                </div>
            </div>

            <div className="col-md-12">

                <Field name="plannedEmployeesForRelease"
                       component={renderMultiselect} label={"Planned Employees For Release:"}
                       data={all} valueField="_id" textField="name"
                />
            </div>

        </div>
        <div className="row initiatEstimation">
            <div className="col-md-6 text-center">
                <button type="submit" disabled={pristine || submitting} className="btn customBtn">Submit</button>
            </div>
            <div className="col-md-6 text-center">
                <button type="button" disabled={pristine || submitting} onClick={reset} className="btn customBtn">Reset</button>
            </div>
        </div>
    </form>
}

EstimationProjectAwardForm = reduxForm({
    form: 'estimation-project-award'
})(EstimationProjectAwardForm)

export default EstimationProjectAwardForm