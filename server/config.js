const config = {
    server: {
        default: {
            port: 3000,
            setupData: true
        },
        development: {
            port: 3000,
            setupData: true
        },
        production: {
            port: 3000,
            setupData: false
        }
    },
    mongo: {
        default: {
            url: 'mongodb://localhost/nnxt',
            useMongoClient: true
        },
        khushboo: {
            url: 'mongodb://khushboo:khushboo@ds251197.mlab.com:51197/nnxt',
            useMongoClient: true
        },
        gaurav: {
            url: 'mongodb://gaurav:gaurav@ds151207.mlab.com:51207/koa-react',
            useMongoClient: true
        }
    }
}

export default config