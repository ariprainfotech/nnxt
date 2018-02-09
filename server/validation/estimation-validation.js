import {RequiredString, ObjectId, validate} from "./index"
import t from 'tcomb-validation'

export const estimationInitiationStruct = t.struct({
    _id: t.Nil,
    description: RequiredString,
    estimator: t.struct({
        _id: ObjectId
    }),
    project: t.struct({
        _id: ObjectId
    }),
    technologies: t.maybe(t.list(t.String)),
    notes: t.Nil,
    release: t.Nil,
    isDeleted: t.Nil,
    isArchived: t.Nil
})

export const estimationEstimatorAddTaskStruct = t.struct({
    _id: t.Nil,
    name: t.maybe(RequiredString),
    description: t.maybe(RequiredString),
    estimatedHours: t.Number,
    estimation: t.struct({
        _id: ObjectId
    }),
    feature: t.maybe(t.struct({
        _id: ObjectId
    })),
    repo: t.maybe(t.struct({
        _id: ObjectId
    })),
    technologies: t.maybe(t.list(t.String)),
    tags: t.maybe(t.list(t.String)),
    notes: t.maybe(t.list(
        t.struct({
            note: t.String
        })
        )
    )
})

export const estimationEstimatorUpdateTaskStruct = t.struct({
    _id: RequiredString,
    name: t.maybe(RequiredString),
    description: t.maybe(RequiredString),
    estimatedHours: t.Number,
    feature: t.maybe(t.struct({
        _id: ObjectId
    })),
    technologies: t.maybe(t.list(t.String)),
    tags: t.maybe(t.list(t.String)),
    notes: t.maybe(t.list(
        t.struct({
            note: t.String
        })
        )
    )
})

export const estimationEstimatorAddFeatureStruct = t.struct({
    _id: t.Nil,
    name: t.maybe(RequiredString),
    description: t.maybe(RequiredString),
    estimation: t.struct({
        _id: ObjectId
    }),
    repo: t.maybe(t.struct({
        _id: ObjectId
    })),
    technologies: t.maybe(t.list(t.String)),
    tags: t.maybe(t.list(t.String)),
    notes: t.maybe(t.list(
        t.struct({
            note: t.String
        })
        )
    )
})

export const estimationEstimatorUpdateFeatureStruct = t.struct({
    _id: ObjectId,
    name: t.maybe(RequiredString),
    description: t.maybe(RequiredString),
    technologies: t.maybe(t.list(t.String)),
    tags: t.maybe(t.list(t.String)),
    notes: t.maybe(t.list(
        t.struct({
            note: t.String
        })
        )
    ),
    repo: t.maybe(t.struct({_id: t.Nil}))
})

export const estimationNegotiatorAddTaskStruct = t.struct({
    _id: t.Nil,
    name: t.maybe(RequiredString),
    description: t.maybe(RequiredString),
    estimatedHours: t.Number,
    estimation: t.struct({
        _id: ObjectId
    }),
    feature: t.maybe(t.struct({
        _id: ObjectId
    })),
    repo: t.maybe(t.struct({
        _id: ObjectId
    })),
    technologies: t.maybe(t.list(t.String)),
    tags: t.maybe(t.list(t.String)),
    notes: t.maybe(t.list(
        t.struct({
            note: t.String
        })
        )
    )
})

export const estimationNegotiatorAddFeatureStruct = t.struct({
    _id: t.Nil,
    name: t.maybe(RequiredString),
    description: t.maybe(RequiredString),
    estimation: t.struct({
        _id: ObjectId
    }),
    repo: t.maybe(t.struct({
        _id: ObjectId
    })),
    technologies: t.maybe(t.list(t.String)),
    tags: t.maybe(t.list(t.String)),
    notes: t.maybe(t.list(
        t.struct({
            note: t.String
        })
        )
    )
})


export const estimationEstimatorMoveToFeatureStruct = t.struct({
    task_id: RequiredString,
    feature_id: RequiredString
})

export const estimationEstimatorMoveOutOfFeatureStruct = t.struct({
    task_id: RequiredString,
    feature_id: RequiredString
})

export const estimationEstimatorRequestRemovalToTaskStruct = t.struct({
    task_id: RequiredString
})

export const estimationEstimatorRequestEditPermissionToTaskStruct = t.struct({
    task_id: RequiredString
})
//Estimator Feature Validation Block End

//Negotiator Feature Validation Block Start

export const estimationNegotiatorUpdateFeatureStruct = t.struct({
    _id: ObjectId,
    name: t.maybe(RequiredString),
    description: t.maybe(RequiredString),
    technologies: t.maybe(t.list(t.String)),
    tags: t.maybe(t.list(t.String)),
    notes: t.maybe(t.list(
        t.struct({
            note: t.String
        })
        )
    ),
    repo: t.maybe(t.struct({_id: t.Nil}))
})

export const estimationNegotiatorMoveToFeatureStruct = t.struct({
    task_id: RequiredString,
    feature_id: RequiredString
})

export const estimationNegotiatorMoveOutOfFeatureStruct = t.struct({
    task_id: RequiredString,
    feature_id: RequiredString
})

export const estimationNegotiatorGrantEditPermissionToTaskStruct = t.struct({
    task_id: RequiredString
})

export const estimationNegotiatorApproveTaskStruct = t.struct({
    task_id: RequiredString
})

export const estimationNegotiatorApproveFeatureStruct = t.struct({
    feature_id: RequiredString
})
export const estimationApproveByNegotiatorStruct = t.struct({
    _id: RequiredString
})
export const estimationProjectAwardByNegotiatorStruct = t.struct({
    _id: RequiredString
})