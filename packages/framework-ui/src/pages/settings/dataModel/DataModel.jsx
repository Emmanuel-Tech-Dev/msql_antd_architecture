import { useSearchParams } from 'react-router-dom';
import { Tabs } from 'antd';
import { ApartmentOutlined } from '@ant-design/icons';
import { PageHeader } from '../../../components/PageHeader';
import TablesView from './TablesView';
import DescribeView from './DescribeView';
import DesignerView from './DesignerView';
import LookupsView from './LookupsView';
import NewTableView from './NewTableView';
import ImportView from './ImportView';

// Settings › Data model (manage:metadata). One browser route; the screen is
// chosen by ?view=, so links and the back button work without more ACL routes.
export default function DataModel() {
    const [params, setParams] = useSearchParams();
    const view = params.get('view') ?? 'tables';
    const table = params.get('table');
    const go = (next) => setParams(Object.fromEntries(Object.entries(next).filter(([, value]) => value)));

    if (view === 'describe' && table) return <DescribeView table={table} go={go} />;
    if (view === 'designer' && table) return <DesignerView table={table} tab={params.get('tab') ?? 'form'} go={go} />;
    if (view === 'new-table') return <NewTableView go={go} />;

    return (
        <PageHeader
            className="admin-page"
            title="Data model"
            description="Describe tables, design their forms and lists, edit lookups and import records. Saved changes apply at once; schema changes become migrations."
            icon={<ApartmentOutlined />}
            items={[{ title: 'Settings' }, { title: 'Data model' }]}
        >
            <Tabs
                activeKey={view}
                onChange={(key) => go({ view: key })}
                items={[
                    { key: 'tables', label: 'Tables', children: <TablesView go={go} /> },
                    { key: 'lookups', label: 'Lookups', children: <LookupsView /> },
                    { key: 'import', label: 'Import records', children: <ImportView /> },
                ]}
            />
        </PageHeader>
    );
}
