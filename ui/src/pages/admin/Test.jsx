import React from 'react'
import { MetadataForm, MetadataFields } from '@msql-antd/framework-ui'

const TestFramework = () => {
    return (
        <div>
            <MetadataForm table={"transaction"} onSave={() => console.log('move to next')} />
            <MetadataFields metadata={"resource_types"} field={["*"]} />
        </div>
    )
}

export default TestFramework