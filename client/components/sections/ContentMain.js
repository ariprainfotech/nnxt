import React, {Component} from 'react'
import PropTypes from 'prop-types'
import ContentSection from './ContentSection'
import {ClientFormContainer, EstimationListContainer, EstimationDetailContainer, ProjectListContainer} from "../../containers"
import * as COC from '../componentConsts'
import * as A from '../../actions'
import {EstimationInitiateDialog, EstimationTaskDialog, ProjectFormDialog} from "../index"
import {Route} from 'react-router-dom'
import * as logger from '../../clientLogger'
import {connect} from 'react-redux'

class ContentMain extends Component {
    constructor(props) {
        super(props)
        logger.debug(logger.CONTENT_MAIN_LIFECYCLE, 'constructor() called: ', props)
        // All the routes that should be configured based on permissions this user has
        let routes = []

        routes.push({
            url: "/",
            render: (props) => {
                return <ContentSection>

                </ContentSection>
            }
        })


        routes.push({
            url: "/client",
            render: (props) => {
                return <ContentSection>
                    <ClientFormContainer name={COC.CLIENT_FORM}/>
                </ContentSection>
            }
        })
        routes.push({
            url: "/projects",
            render: (props) => {

                console.log("estimation props ", props)
                return <ContentSection>
                    <ProjectFormDialog name={COC.PROJECT_FORM_DIALOG} show={true} close={
                        () => {
                            this.props.dispatch(A.hideComponent(COC.PROJECT_FORM_DIALOG))
                        }
                    }/>
                    <ProjectListContainer name={COC.PROJECT_LIST}/>
                </ContentSection>



            }
        })

        routes.push({
            url: "/estimation",
            render: (props) => {
                console.log("estimation props ", props)
                return <ContentSection>
                    <EstimationInitiateDialog name={COC.ESTIMATION_INITIATE_DIALOG} show={true} close={
                        () => {
                            this.props.dispatch(A.hideComponent(COC.ESTIMATION_INITIATE_DIALOG))
                        }
                    }/>
                    <EstimationListContainer name={COC.ESTIMATION_LIST}/>
                </ContentSection>
            }
        })

        routes.push({
            url: "/estimation-detail",
            render: (props) => {
                console.log("estimation detail props ", props)
                return <ContentSection>
                    <EstimationTaskDialog name={COC.ESTIMATION_TASK_DIALOG} show={true} close={
                        () => {
                            this.props.dispatch(A.hideComponent(COC.ESTIMATION_TASK_DIALOG))
                        }
                    }/>
                    <EstimationDetailContainer name={COC.ESTIMATION_DETAIL_PAGE}/>
                </ContentSection>
            }
        })

        this.state = {
            routes: routes
        }
    }

    render() {
        logger.debug(logger.CONTENT_MAIN_RENDER, this.props)
        return <div>
            {
                this.state.routes.length > 0 &&
                <Route key={"app_home_route"} dispatch={this.props.dispatch} exact path={this.props.match.url}
                       render={this.state.routes[0].render}/>
            }
            {
                this.state.routes.map((route, idx) => <Route key={"app_route" + idx}
                                                             dispatch={this.props.dispatch}
                                                             path={this.props.match.url + route.url}
                                                             render={route.render}/>)

            }
        </div>
    }
}

export default ContentMain