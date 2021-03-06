import React, {Component} from 'react'
import {Field, formValueSelector, reduxForm} from 'redux-form'
import {renderMultiSelect, renderText} from './fields'
import {email, passwordLength, required} from "./validation"
import {connect} from 'react-redux'
import * as logger from '../../clientLogger'

const passwordMatch = (value, values) => {

    return (value != values.password) ? `Should match password value` : undefined
}

class UserForm extends Component {
    constructor(props) {
        super(props);
    }

    render() {
        logger.debug(logger.USER_FORM_RENDER, 'props', this.props)
        const {_id, changeCredentials} = this.props;

        return [
            <div key="UserFormBackButton" className="col-md-12">
                <button className="glyphicon glyphicon-arrow-left customBtn pull-left btn" type="button" style={{margin:'10px 0px'}}
                        onClick={() => this.props.showUserList()}>
                </button>
            </div>,
            <form key="UserForm" onSubmit={this.props.handleSubmit}>
                <div className="clearfix">
                    <div className="col-md-4">
                        <Field name="_id" component="input" className="form-control" type="hidden"></Field>
                        <Field name="firstName" label="First Name:" component={renderText} type="text"
                               validate={[required]}/>

                        <Field name="lastName" label="Last Name:" component={renderText} type="text"
                               validate={[required]}/>
                        <Field
                            name="roles"
                            component={renderMultiSelect} label="Roles:"
                            data={this.props.roles} validate={[required]} valueField="_id" textField="name"/>

                        <Field name="email" label="Email:" component={renderText} type="email"
                               validate={[required, email]}/>


                        {this.props._id &&
                        <div>
                            <label><Field name="changeCredentials" component="input" type="checkbox"/>Change
                                Credentials</label>
                        </div>
                        }
                        {(!this.props._id || changeCredentials) &&
                        <Field name="password" label="Password:" component={renderText} type="password"
                               validate={[required, passwordLength]}/>}

                        {(!this.props._id || changeCredentials) &&
                        <Field name="confirmPassword" label="Confirm Password:" component={renderText} type="password"
                               validate={[required, passwordLength, passwordMatch]}/>}

                        <button type="submit" style={{margin:'10px 0px'}}
                                className="btn customBtn"> {(!this.props._id && "Add") || (this.props._id && "Update")} </button>
                    </div>
                </div>
            </form>]

    }
}

UserForm = reduxForm({
    form: 'user'
})(UserForm)

const selector = formValueSelector('user')

UserForm = connect(
    state => {
        const {_id, changeCredentials} = selector(state, '_id', 'changeCredentials')
        const selectedRoles = selector(state, 'roles')
        return {
            _id,
            changeCredentials,
            selectedRoles
        }
    }
)(UserForm)


export default UserForm
