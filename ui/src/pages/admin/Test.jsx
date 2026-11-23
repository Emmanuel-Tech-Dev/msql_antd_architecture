import React from 'react'
import MetadataForm from '../../components/metadata/MetadataForm'
import MetadataFields from '../../components/metadata/MetadataFields'

const TestFramework = () => {
    return (
        <div>
            <MetadataForm table={"transaction"} onSave={() => console.log('move to next')} />
            <MetadataFields metadata={"resource_types"} field={["*"]} />
        </div>
    )
}

export default TestFramework