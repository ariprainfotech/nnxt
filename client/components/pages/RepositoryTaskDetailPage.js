import React, {Component} from 'react'

class RepositoryTaskDetailPage extends Component {
    constructor(props) {
        super(props)
        this.state = {
            showHistory: false
        }
        this.showHistoryDetail = this.showHistoryDetail.bind(this);
    }

    showHistoryDetail() {
        this.setState({showHistory: !this.state.showHistory})
    }

    render() {
        const {task, estimationId} = this.props
        const {showHistory} = this.state
        return (
            <div className="col-md-12">
                <div className="col-md-10">
                    <h3 className="repo-detail-header">{task.name} </h3>
                </div>
                <div className="col-md-2">
                    <h3 className="repo-detail-hour">{task.estimatedHours ? '(' + task.estimatedHours + ')' : '(00)'} </h3>
                </div>
                <div className="col-md-12">
                    <p className=" repo-detail repositoryModalPara">Task Description: {task.description} </p>
                </div>
                <div className="col-md-12 pad">
                    <div className="col-md-3">
                        <button className="customBtn" type="button" onClick={
                            this.showHistoryDetail
                        }>History
                        </button>
                    </div>
                    <div className="col-md-4 pad">
                        <button className="customBtn" type="button" onClick={() => {
                            this.props.addTask(estimationId, task._id)
                        }}>Add to Estimation
                        </button>
                    </div>
                    <div className="col-md-5">
                        <button type="button" className="customBtn" onClick={() => {
                            this.props.copyTask(estimationId, task._id)
                        }}>Copy To Estimation
                        </button>
                    </div>
                </div>
                {showHistory &&
                <div>{task.hasHistory ?
                    <div>
                        <lablel>under Construction</lablel>
                    </div>
                    :
                    <lablel>No History available</lablel>

                } </div>}
            </div>
        )
    }

}

export default RepositoryTaskDetailPage