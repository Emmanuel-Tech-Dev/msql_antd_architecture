// hooks/useTable.js
import { useAntdTable } from 'ahooks';
import { Form } from 'antd';

function useTable(apiFn, options = {}) {
    const [form] = Form.useForm();

    const service = async ({ current, pageSize, sorter, filters, extra, action, ...formValues }) => {
        const query = {
            page: current,
            limit: pageSize,
            ...formValues,
        };

        // Sorting
        if (sorter && !Array.isArray(sorter) && sorter.field && sorter.order) {
            query.sort_by = Array.isArray(sorter.field) ? sorter.field.join('.') : sorter.field;
            query.sort_order = sorter.order === 'descend' ? 'DESC' : 'ASC';
        }

        // Column filters → your _in convention
        if (filters) {
            Object.entries(filters).forEach(([key, value]) => {
                if (value && value.length > 0) {
                    query[value.length === 1 ? key : `${key}_in`] = value.length === 1
                        ? value[0]
                        : value.join(',');
                }
            });
        }

        const res = await apiFn(query);

        return {
            total: res.pagination.total,
            list: res.result,
        };
    };

    const { tableProps, search, loading, refresh, params } = useAntdTable(service, {
        form,
        defaultPageSize: options.defaultPageSize || 20,
        ...options,
    });

    return {
        tableProps: {
            ...tableProps,
            pagination: {
                ...tableProps.pagination,
                showSizeChanger: true,
                showTotal: (total) => `Total ${total} records`,
                ...(options.pagination || {}),
            },
        },
        form,
        search,
        loading,
        refresh,
        params,
    };
}


export default useTable