import React from 'react'

import * as SC from "../../../server/serverconstants"
import * as logger from '../../clientLogger'
import _ from 'lodash'


let EstimationFeatureTask = (props) => {
    const {task} = props
    return <div className="task">
        <div className="col-md-12 pad">
            <h4>{task.estimator.name ? task.estimator.name : task.negotiator.name}</h4>
        </div>
        <div className="col-md-12 pad">
            <p>{task.estimator.description ? task.estimator.description : task.negotiator.description}</p>
        </div>
        <div className="col-md-2 col-md-offset-1 pad">
            <h4>Est. Hrs:</h4> <h4>&nbsp;{task.estimator.estimatedHours}</h4>
        </div>
        <div className="col-md-3 pad">
            <h4>Sug. Hrs:</h4> <h4>&nbsp;{task.negotiator.estimatedHours}</h4>
        </div>
        <div className="col-md-6 text-right estimationActions pad">

        </div>

    </div>
}


class EstimationExpandedFeature extends React.PureComponent {

    render() {
        const {feature, loggedInUserRole, estimationStatus, index} = this.props;

        logger.debug(logger.ESTIMATION_FEATURE_DETAIL_RENDER, this.props)

        return <div className="feature-expanded">
            <div className="col-md-12 pad" onClick={() => {
                this.props.expandFeature(feature._id)
            }}>
                <h4>{feature.estimator.name ? feature.estimator.name : feature.negotiator.name}</h4>
            </div>
            <div className="col-md-12 pad" onClick={() => {
                this.props.expandFeature(feature._id)
            }}>
                <p>{feature.estimator.description ? feature.estimator.description : feature.negotiator.description}</p>
            </div>
            <div className="col-md-2 col-md-offset-1 pad">
                <h4>Est. Hrs:</h4> <h4>&nbsp;{feature.estimator.estimatedHours}</h4>
            </div>
            <div className="col-md-3 pad">
                <h4>Sug. Hrs:</h4> <h4>&nbsp;{feature.negotiator.estimatedHours}</h4>
            </div>
            <div className="col-md-6 text-right estimationActions pad">
                {/* feature buttons to go here */}
            </div>

            <div className="col-md-11 col-md-offset-1">
                {
                    Array.isArray(feature.tasks) && feature.tasks.length > 0 &&
                    feature.tasks.map(t => <EstimationFeatureTask task={t}/>)
                }

            </div>
        </div>
    }
}


class EstimationFeature extends React.PureComponent {

    render() {
        const {feature, loggedInUserRole, estimationStatus, index} = this.props

        let buttons = [];

        logger.debug(logger.ESTIMATION_TASK_BUTTONS, 'logged in user is ', loggedInUserRole)
        logger.debug(logger.ESTIMATION_TASK_BUTTONS, 'task owner ', feature.owner)
        logger.debug(logger.ESTIMATION_FEATURE_RENDER, this.props)

        let editView = false

        if (loggedInUserRole == SC.ROLE_NEGOTIATOR && _.includes([SC.STATUS_INITIATED, SC.STATUS_REVIEW_REQUESTED], estimationStatus) || loggedInUserRole == SC.ROLE_ESTIMATOR && _.includes([SC.STATUS_ESTIMATION_REQUESTED, SC.STATUS_CHANGE_REQUESTED], estimationStatus))
            editView = true

        if (loggedInUserRole == SC.ROLE_NEGOTIATOR) {


            /**
             * Negotiator would always be able to edit any task (would be considered as suggestions), first button hence would always be edit
             * He would also be able to delete any task
             */


            if (feature.negotiator.changeRequested) {
                // As negotiator has requested change, means he has added his suggestions during this iteration, show appropriate suggestion button
                buttons.push(editView ? <img key="suggestion_outgoing" src="/images/suggestion_outgoing.png"
                                             onClick={() => {
                                                 this.props.showFeatureSuggestionForm(feature, loggedInUserRole)
                                             }}/> :
                    <img key="suggestion_outgoing" src="/images/suggestion_outgoing_disable.png"/>)
            } else {
                buttons.push(editView ? <img key="suggestion" src="/images/suggestion.png"
                                             onClick={() => {
                                                 this.props.showFeatureSuggestionForm(feature, loggedInUserRole)
                                             }}/> : <img key="suggestion" src="/images/suggestion_disable.png"/>)
            }

            if (feature.estimator.removalRequested) {
                // Estimator has requested removal
                buttons.push(editView ? <img key="he_requested_delete" src="/images/he_requested_delete.png"
                                             onClick={() => {
                                                 this.props.deleteFeature(feature)
                                             }}/> :
                    <img key="he_requested_delete" src="/images/he_requested_delete_disable.png"/>)
            } else {
                buttons.push(editView ? <img key="delete" src="/images/delete.png"
                                             onClick={() => {
                                                 this.props.deleteFeature(feature)
                                             }}/> : <img key="delete" src="/images/delete_disable.png"/>)
            }

            if (feature.estimator.changeRequested) {
                if (feature.negotiator.changeGranted) {
                    // estimator has requested change which negotiator has granted
                    buttons.push(editView ? <img key="granted_edit" src="/images/granted_edit.png"
                                                 onClick={() => {
                                                     this.props.toggleGrantEdit(feature)
                                                 }}/> :
                        <img key="granted_edit" src="/images/granted_edit_disable.png"/>)
                } else {
                    // estimator has requested change but negotiator has not granted it till now
                    logger.debug(logger.ESTIMATION_TASK_BUTTONS, 'changeRequested/not granted, heRequestedEditFeature')
                    buttons.push(editView ? <img key="he_requested_edit" src="/images/he_requested_edit.png"
                                                 onClick={() => {
                                                     this.props.toggleGrantEdit(feature)
                                                 }}/> :
                        <img key="he_requested_edit" src="/images/he_requested_edit_disable.png"/>)
                }
            }

        } else if (loggedInUserRole == SC.ROLE_ESTIMATOR) {



            /**
             * First button show to estimator would always be edit or its variations
             **/

            if (feature.owner == SC.OWNER_ESTIMATOR) {
                if (feature.addedInThisIteration) {
                    logger.debug(logger.ESTIMATION_FEATURE_BUTTONS, 'added in this iteration, edit button')
                    // Estimator would see plain edit button in case he has added task in this iteration
                    buttons.push(editView ? <img key="edit" src="/images/edit.png"
                                                 onClick={() => {
                                                     this.props.showEditFeatureForm(feature)
                                                 }}/> : <img key="edit" src="/images/edit_disable.png"/>)

                    buttons.push(editView ? <img key="delete" src="/images/delete.png"
                                                 onClick={() => {
                                                     this.props.deleteFeature(feature)
                                                 }}/> : <img key="delete" src="/images/delete_disable.png"/>)
                } else {
                    if (feature.negotiator.changeRequested) {
                        logger.debug(logger.ESTIMATION_FEATURE_BUTTONS, 'negotiator requested change, he_requested_edit button')
                        // Negotiator has requested change
                        buttons.push(editView ? <img key="suggestion_incoming" src="/images/suggestion_incoming.png"
                                                     onClick={() => {
                                                         this.props.showFeatureSuggestionForm(feature, loggedInUserRole)
                                                     }}/> :
                            <img key="suggestion_incoming" src="/images/suggestion_incoming_disable.png"/>)
                    } else if (feature.estimator.changeRequested) {
                        if (feature.negotiator.changeGranted) {
                            // estimator has requested change which negotiator has granted
                            logger.debug(logger.ESTIMATION_FEATURE_BUTTONS, 'changeRequested/changeGranted, he_granted_edit')
                            buttons.push(editView ? <img key="he_granted_edit" src="/images/he_granted_edit.png"
                                                         onClick={() => this.props.showEditFeatureForm(feature)}/> :
                                <img key="he_granted_edit" src="/images/he_granted_edit_disable.png"/>)
                        } else {
                            // estimator has requested change but negotiator has not granted it till now
                            buttons.push(editView ? <img key="requested_edit" src="/images/requested_edit.png"
                                                         onClick={() => {
                                                             this.props.toggleEditRequest(feature)
                                                         }}/> :
                                <img key="requested_edit" src="/images/requested_edit_disable.png"/>)
                        }
                    } else {
                        // Estimator has not requested change and has no permission to change task either so he can request change
                        logger.debug(logger.ESTIMATION_FEATURE_BUTTONS, 'can request edit, request_edit')
                        buttons.push(editView ?
                            <img key="request_edit" src="/images/request_edit.png" onClick={() => {
                                this.props.toggleEditRequest(feature)
                            }}/> : <img key="request_edit" src="/images/request_edit_disable.png"/>)
                    }

                    if (feature.estimator.removalRequested) {
                        // Estimator has requested removal
                        buttons.push(editView ? <img key="requested_delete" src="/images/requested_delete.png"
                                                     onClick={() => {
                                                         this.props.toggleDeleteRequest()
                                                     }}/> :
                            <img key="requested_delete" src="/images/requested_delete_disable.png"/>)
                    } else {
                        // Estimator can request removal
                        buttons.push(editView ?
                            <img key="request_delete" src="/images/request_delete.png" onClick={() => {
                                this.props.toggleDeleteRequest()
                            }}/> : <img key="request_delete" src="/images/request_delete_disable.png"/>)
                    }
                }
            } else if (feature.owner == SC.OWNER_NEGOTIATOR) {
                if (feature.negotiator.changeRequested) {
                    logger.debug(logger.ESTIMATION_FEATURE_BUTTONS, 'estimator suggestion_incoming change, suggestion_incoming button')
                    /* Negotiator has provided suggestions, clicking this button should show a window that would
                       allow estimator to see suggestions given by negotiator
                     */
                    buttons.push(editView ? <img key="suggestion_incoming" src="/images/suggestion_incoming.png"
                                                 onClick={() => {
                                                     this.props.showFeatureSuggestionForm(feature, loggedInUserRole)
                                                 }}/> :
                        <img key="suggestion_incoming" src="/images/suggestion_incoming_disable.png"/>)
                }

                if (feature.estimator.changeRequested) {
                    if (feature.negotiator.changeGranted) {
                        // estimator has requested change which negotiator has granted
                        buttons.push(editView ? <img key="granted_edit" src="/images/he_granted_edit.png"
                                                     onClick={() =>
                                                         this.props.showEditFeatureForm(feature)
                                                     }/> :
                            <img key="granted_edit" src="/images/he_granted_edit_disable.png"/>)
                    } else {
                        // estimator has requested change but negotiator has not granted it till now
                        buttons.push(editView ? <img key="requested_edit" src="/images/requested_edit.png"
                                                     onClick={() => {
                                                         this.props.toggleEditRequest(feature)
                                                     }}/> :
                            <img key="requested_edit" src="/images/requested_edit_disable.png"/>)

                    }
                } else {
                    // Estimator has not requested change and has no permission to change task either so he can request change
                    logger.debug(logger.ESTIMATION_FEATURE_BUTTONS, 'can request edit, request_edit')
                    buttons.push(editView ? <img key="request_edit" src="/images/request_edit.png"
                                                 onClick={() => {
                                                     this.props.toggleEditRequest(feature)
                                                 }}/> :
                        <img key="request_edit" src="/images/request_edit_disable.png"/>)
                }

                if (feature.estimator.removalRequested) {
                    // Estimator has requested removal
                    buttons.push(editView ? <img key="he_requested_delete" src="/images/he_requested_delete.png"
                                                 onClick={() => {
                                                     this.props.toggleDeleteRequest(feature)
                                                 }}/> :
                        <img key="he_requested_delete" src="/images/he_requested_delete_disable.png"/>)
                } else {
                    // Estimator can request removal
                    buttons.push(editView ? <img key="request_delete" src="/images/request_delete.png" onClick={() => {
                        this.props.toggleDeleteRequest(feature)
                    }}/> : <img key="request_delete" src="/images/request_delete_disable.png"/>)
                }
            }
        }

        return <div className="feature">
            <div className="col-md-12 pad">
                <div className="col-md-9" onClick={() => {
                    this.props.expandFeature(feature._id)
                }}>
                    <h4>{feature.estimator.name ? feature.estimator.name : feature.negotiator.name}</h4>
                </div>

                <div className="col-md-3">
                    {feature.owner == SC.OWNER_ESTIMATOR && feature.addedInThisIteration &&
                    <div className="flagStrip">
                        <img src="/images/estimator_new_flag.png"></img>
                    </div>}

                    {feature.owner == SC.OWNER_NEGOTIATOR && feature.addedInThisIteration &&
                    <div className="flagStrip">
                        <img src="/images/negotiator_new_flag.png"></img>
                    </div>}

                    {feature.estimator.changedInThisIteration && <div className="flagStrip">
                        <img src="/images/estimator_edit_flag.png"></img>
                    </div>}

                    {feature.negotiator.changedInThisIteration && <div className="flagStrip">
                        <img src="/images/negotiator_edit_flag.png"></img>
                    </div>}

                    {!feature.repo.addedFromThisEstimation &&
                    <div className="flagStrip">
                        <img src="/images/repo_flag.png"></img>
                    </div>
                    }
                </div>

            </div>
            <div className="col-md-12 short-description" onClick={() => {
                this.props.expandFeature(feature._id)
            }}>
                <p>{feature.estimator.description ? feature.estimator.description : feature.negotiator.description}</p>
            </div>
            <div className="col-md-3">
                <h4>Estimated:</h4>
                <h4>&nbsp;{feature.estimator.estimatedHours} {feature.estimator.estimatedHours && 'Hours'}</h4>
            </div>
            <div className="col-md-3">
                <h4>Suggested:</h4>
                <h4>&nbsp;{feature.negotiator.estimatedHours} {feature.negotiator.estimatedHours && 'Hours'}</h4>
            </div>

            <div className="col-md-6 text-right estimationActions">
                {buttons}
            </div>

        </div>

    }
}

let EstimationFeatures = (props) => {
    let childProps = Object.assign({}, props, {
        features: undefined
    })

    return Array.isArray(props.features) && props.features.map((f, idx) =>
        (props.expandedFeatureID === f._id) ?
            <EstimationExpandedFeature feature={f} index={idx} key={"feature" + idx} {...childProps}/> :
            <EstimationFeature feature={f} index={idx} key={"feature" + idx} {...childProps}/>
    )
}

export default EstimationFeatures