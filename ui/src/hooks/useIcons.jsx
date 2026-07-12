import { useCallback, useMemo } from "react";
import {
    // Navigation / layout
    DashboardOutlined,
    AppstoreOutlined,
    HomeOutlined,
    MenuOutlined,
    BarsOutlined,
    AppstoreAddOutlined,
    LayoutOutlined,

    // People / identity
    UserOutlined,
    TeamOutlined,
    UsergroupAddOutlined,
    UserAddOutlined,
    UserDeleteOutlined,
    UserSwitchOutlined,
    ContactsOutlined,
    IdcardOutlined,

    // Security / access
    SafetyOutlined,
    SafetyCertificateOutlined,
    KeyOutlined,
    LockOutlined,
    UnlockOutlined,
    EyeOutlined,
    EyeInvisibleOutlined,

    // Settings / tools
    SettingOutlined,
    ToolOutlined,
    ControlOutlined,
    ApiOutlined,
    CodeOutlined,
    BugOutlined,
    ClusterOutlined,
    DatabaseOutlined,
    CloudOutlined,
    CloudServerOutlined,

    // Files / documents
    FileOutlined,
    FileTextOutlined,
    FilePdfOutlined,
    FileExcelOutlined,
    FileWordOutlined,
    FileImageOutlined,
    FolderOutlined,
    FolderOpenOutlined,
    PaperClipOutlined,

    // Actions / status
    CheckOutlined,
    CheckCircleOutlined,
    CloseOutlined,
    CloseCircleOutlined,
    ExclamationCircleOutlined,
    InfoCircleOutlined,
    QuestionCircleOutlined,
    WarningOutlined,
    PlusOutlined,
    MinusOutlined,
    EditOutlined,
    DeleteOutlined,
    SaveOutlined,
    SearchOutlined,
    FilterOutlined,
    ReloadOutlined,
    SyncOutlined,

    // Communication
    MailOutlined,
    MessageOutlined,
    NotificationOutlined,
    BellOutlined,
    PhoneOutlined,
    SendOutlined,

    // Charts / data
    BarChartOutlined,
    LineChartOutlined,
    PieChartOutlined,
    FundOutlined,
    RiseOutlined,
    FallOutlined,

    // Commerce / finance
    DollarOutlined,
    ShoppingCartOutlined,
    ShoppingOutlined,
    CreditCardOutlined,
    WalletOutlined,
    BankOutlined,

    // Misc / general
    CalendarOutlined,
    ClockCircleOutlined,
    EnvironmentOutlined,
    GlobalOutlined,
    LinkOutlined,
    StarOutlined,
    HeartOutlined,
    FlagOutlined,
    TagOutlined,
    TagsOutlined,
    RocketOutlined,
    ThunderboltOutlined,
    BulbOutlined,
    GiftOutlined,
} from "@ant-design/icons";

// Store component REFERENCES, not pre-built <Icon /> elements.
// This is just object property assignment -- no React.createElement calls
// happen here, so unused icons cost nothing at runtime, only at import time
// (and even that is stripped by tree-shaking for icons you never reference).
const ICON_MAP = {
    // Navigation / layout
    DashboardOutlined,
    AppstoreOutlined,
    HomeOutlined,
    MenuOutlined,
    BarsOutlined,
    AppstoreAddOutlined,
    LayoutOutlined,

    // People / identity
    UserOutlined,
    TeamOutlined,
    UsergroupAddOutlined,
    UserAddOutlined,
    UserDeleteOutlined,
    UserSwitchOutlined,
    ContactsOutlined,
    IdcardOutlined,

    // Security / access
    SafetyOutlined,
    SafetyCertificateOutlined,
    KeyOutlined,
    LockOutlined,
    UnlockOutlined,
    EyeOutlined,
    EyeInvisibleOutlined,

    // Settings / tools
    SettingOutlined,
    ToolOutlined,
    ControlOutlined,
    ApiOutlined,
    CodeOutlined,
    BugOutlined,
    ClusterOutlined,
    DatabaseOutlined,
    CloudOutlined,
    CloudServerOutlined,

    // Files / documents
    FileOutlined,
    FileTextOutlined,
    FilePdfOutlined,
    FileExcelOutlined,
    FileWordOutlined,
    FileImageOutlined,
    FolderOutlined,
    FolderOpenOutlined,
    PaperClipOutlined,

    // Actions / status
    CheckOutlined,
    CheckCircleOutlined,
    CloseOutlined,
    CloseCircleOutlined,
    ExclamationCircleOutlined,
    InfoCircleOutlined,
    QuestionCircleOutlined,
    WarningOutlined,
    PlusOutlined,
    MinusOutlined,
    EditOutlined,
    DeleteOutlined,
    SaveOutlined,
    SearchOutlined,
    FilterOutlined,
    ReloadOutlined,
    SyncOutlined,

    // Communication
    MailOutlined,
    MessageOutlined,
    NotificationOutlined,
    BellOutlined,
    PhoneOutlined,
    SendOutlined,

    // Charts / data
    BarChartOutlined,
    LineChartOutlined,
    PieChartOutlined,
    FundOutlined,
    RiseOutlined,
    FallOutlined,

    // Commerce / finance
    DollarOutlined,
    ShoppingCartOutlined,
    ShoppingOutlined,
    CreditCardOutlined,
    WalletOutlined,
    BankOutlined,

    // Misc / general
    CalendarOutlined,
    ClockCircleOutlined,
    EnvironmentOutlined,
    GlobalOutlined,
    LinkOutlined,
    StarOutlined,
    HeartOutlined,
    FlagOutlined,
    TagOutlined,
    TagsOutlined,
    RocketOutlined,
    ThunderboltOutlined,
    BulbOutlined,
    GiftOutlined,
};

const FALLBACK_ICON = AppstoreOutlined;
const EMPTY_EXTRA_ICONS = {};

/**
 * useIcons
 *
 * Resolves an icon name (string) to a rendered AntD icon element.
 *
 * Perf notes:
 * - ICON_MAP holds component references, not JSX elements, so building
 *   the map never calls createElement for icons you don't use.
 * - resolveIcon only instantiates (<IconComponent />) the single icon
 *   actually requested, at call time.
 * - iconMap/resolveIcon are memoized so they stay referentially stable
 *   across re-renders (safe to use in effect deps, memo'd children, etc).
 *
 * @param {Object} [extraIcons] - extra { name: Component } pairs to merge in,
 *   e.g. useIcons({ BellOutlined }) — pass the component, not <BellOutlined />.
 */
export default function useIcons(extraIcons = EMPTY_EXTRA_ICONS) {
    const iconMap = useMemo(
        () => ({ ...ICON_MAP, ...extraIcons }),
        [extraIcons],
    );

    const resolveIcon = useCallback(
        (iconString, props) => {
            const IconComponent = iconMap[iconString] ?? FALLBACK_ICON;
            return <IconComponent {...props} />;
        },
        [iconMap],
    );

    return { resolveIcon, iconMap, iconNames: Object.keys(iconMap) };
}
