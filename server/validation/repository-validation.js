import {ObjectId, RequiredString} from "./index"
import t from 'tcomb-validation'

export const repositoryAddTaskStruct = t.struct({
    _id: t.Nil,
    name: RequiredString,
    description: RequiredString,
    feature: t.maybe(t.struct({
        _id: ObjectId
    })),
    createdBy: t.maybe(t.struct({
        _id: ObjectId,
        firstName: RequiredString,
        lastName: t.maybe(RequiredString)
    })),
    technologies: t.maybe(t.list(t.String)),
    tags: t.maybe(t.list(t.String)),
    tasks: t.Nil
})

export const repositoryUpdateTaskAndFeatureStruct = t.struct({
    _id: RequiredString,
    name: RequiredString,
    description: RequiredString,
    estimation: t.struct({
        _id: ObjectId
    }),
    technologies: t.maybe(t.list(t.String)),
    tags: t.maybe(t.list(t.String)),
    tasks: t.Nil
})

export const repositorySearchStruct = t.struct({
    _id: t.Nil,
    page_no:t.Number,
    technologies: t.maybe(t.list(t.String)),
    filters: t.maybe(t.list(t.String)),
    search_text: t.maybe(t.String)
})