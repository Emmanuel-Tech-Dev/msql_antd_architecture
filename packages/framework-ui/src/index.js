import 'antd/dist/antd.css';
import 'antd-distinct-system-css/index.css';
import 'mapbox-gl/dist/mapbox-gl.css';
import './styles.css';

export { default as FrameworkApp } from './FrameworkApp.jsx';
export { configureFramework, frameworkConfig } from './core/config/frameworkConfig';

// Providers and their contexts
export { default as FrameworkProvider } from './core/provider/FrameworkProvider.jsx';
export { default as mysqlOrmProvider } from './core/provider/mysqlOrmProvider';
export { default as mysqlOrmAuthProvider } from './core/provider/mysqlOrmAuthProvider';
export { default as SocketProvider } from './core/realtime/SocketProvider.jsx';
export { ThemeProvider } from './utils/ThemeProvider.jsx';
export { useDataProvider } from './core/provider/DataProvider';
export { useAuthProvider } from './core/provider/AuthProvider';
export { useAccessProvider, checkAccess, isPrivilegedRole } from './core/provider/AccessProvider';
export {
  useResource,
  useResourceProvider,
  useBrowserRoutes,
  useNavigationRoutes,
  useResourcesReady,
  isRouteVisibleInNav,
} from './core/provider/ResourceProvider';
export { default as useFramework } from './core/hooks/useFramework';

// Data hooks
export { default as useList } from './core/hooks/data/useList';
export { default as useOne } from './core/hooks/data/useOne';
export { default as useMany } from './core/hooks/data/useMany';
export { default as useCreate } from './core/hooks/data/useCreate';
export { default as useUpdate } from './core/hooks/data/useUpdate';
export { default as useDeleteOne } from './core/hooks/data/useDelete';
export { useCustom, useCustomMutation } from './core/hooks/data/useCustom';
export { DataProviderError, getUserFacingErrorMessage } from './core/data/contracts';

// Auth and access hooks
export { default as useLogin } from './core/hooks/auth/useLogin';
export { default as useLogout } from './core/hooks/auth/useLogout';
export { default as useGoogleLogin } from './core/hooks/auth/useGoogleLogin';
export { default as useIdentity } from './core/hooks/auth/useIdentity';
export { default as usePermissions } from './core/hooks/auth/usePermissions';
export { default as useRegister } from './core/hooks/auth/useRegister';
export { default as useForgotPassword } from './core/hooks/auth/useForgotPassword';
export { default as useResetPassword } from './core/hooks/auth/useResetPassword';
export { default as useChangePassword } from './core/hooks/auth/useChangePassword';
export { default as useCan } from './core/hooks/access/useCan';
export { default as useRouteGuard } from './core/hooks/access/useRouteGuard';
export { Can, PageLink } from './components/access/Can.jsx';

// Metadata-driven forms and tables
export { default as MetadataForm } from './components/metadata/MetadataForm.jsx';
export { default as MetadataFields } from './components/metadata/MetadataFields.jsx';
export { default as MetadataTable } from './components/metadata/MetadataTable.jsx';
export { default as StepsLayout } from './components/metadata/StepsLayout.jsx';
export { default as ListField, ListCell } from './components/metadata/ListField.jsx';
export { default as LookupSelect } from './components/metadata/LookupSelect.jsx';
export { default as UploadField } from './components/metadata/UploadField.jsx';
export { default as IconSelect } from './components/metadata/IconSelect.jsx';
export { registerFieldType, getFieldType } from './core/metadata/fieldTypes.jsx';
export { registerFormLayout, getFormLayout } from './core/metadata/formLayouts';
export { useTableMetadata, useLookupOptions } from './core/metadata/useTableMetadata';
export { conditionMet, fieldLabel, isFieldRequired, primaryKeyOf } from './core/metadata/fieldRules';

// Components
export { default as AppLayout } from './components/Layout/AppLayout.jsx';
export { PageHeader } from './components/PageHeader.jsx';
export { default as CustomTable } from './components/CustomTable.jsx';
export { default as ThemeToggle } from './components/ThemeToggle.jsx';
export { default as RichTextEditor } from './components/editor/RichTextEditor.jsx';
export { default as AppLoading, PageLoading } from './components/feedback/AppLoading.jsx';
export { default as NotFound404 } from './components/feedback/NotFound404.jsx';
export { MapView, DirectionsMap, LocationPicker } from './components/map';

// UI hooks
export { default as useRecordForm } from './hooks/useRecordForm.jsx';
export { default as useDynamicForm } from './hooks/useDynamicForm.jsx';
export { default as useDynamicFilter } from './hooks/useDynamicFilter.jsx';
export { default as useModal } from './hooks/useModal.jsx';
export { default as useDrawer } from './hooks/useDrawer.jsx';
export { default as useNotification } from './hooks/useNotification.jsx';
export { default as useUpload } from './hooks/useUpload.jsx';
export { default as useDelete } from './hooks/useDelete.jsx';
export { default as useApi } from './hooks/useApi.jsx';
export { default as useTableApi } from './hooks/useTableApi.jsx';
export { default as useIcons } from './hooks/useIcons.jsx';
export { default as useChart } from './hooks/useChart.jsx';
export { default as useCalendar } from './hooks/useCalender.jsx';
export { default as useTextEditor } from './hooks/useTextEditor.jsx';
export { default as useLocalForage } from './hooks/useLocalForage.jsx';
export { default as useGlobalSelect } from './hooks/useGlobalSelect.jsx';
export { useTheme } from './hooks/useTheme.jsx';
export { default as useSider } from './hooks/useSider.jsx';
export { default as useMap } from './hooks/useMap';
export { default as useMasonry } from './hooks/useMasonary.jsx';
export { default as useDraggable } from './hooks/useDraggable.jsx';
export { default as useScrollToTop } from './hooks/useScrolToTop.jsx';
export { default as useTableState } from './hooks/table/useTableState.jsx';
export { default as useTableQuery } from './hooks/table/useTableQuery.jsx';
export { default as useTableColumns } from './hooks/table/useTableColumns.jsx';
export { default as useRowSelection } from './hooks/table/useRowSelection.jsx';

// Shared clients and helpers
export { default as apiClient } from './services/apiClient';
export { default as queryClient } from './core/queryClient';
export { default as queryKeys } from './core/queryKeys';
export { default as useAuthStore } from './store/authStore';
export { default as utils } from './utils/function_utils';
