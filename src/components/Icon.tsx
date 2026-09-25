import {
  AlarmIcon, ArchiveIcon, ArrowCounterClockwiseIcon, ArrowLeftIcon, ArrowRightIcon, ArrowUpRightIcon, BarbellIcon, BellIcon,
  BookOpenIcon, BrainIcon, BriefcaseIcon, CalendarCheckIcon, CaretDownIcon, CaretRightIcon, CaretUpIcon, ChartBarIcon,
  CheckIcon, CheckSquareIcon, ClockCounterClockwiseIcon, CloudSlashIcon, DeviceMobileIcon, DotsThreeVerticalIcon,
  DownloadSimpleIcon, DropIcon, FileCodeIcon, FileZipIcon, FireIcon, FlagIcon, FlowerLotusIcon, HandHeartIcon, HardDrivesIcon,
  HashIcon, HeartbeatIcon, ImageIcon, InfoIcon, LifebuoyIcon, LightningIcon, ListChecksIcon, LockIcon, MagnifyingGlassIcon,
  MedalIcon, MinusIcon, MoonIcon, NoteIcon, NotebookIcon, PaletteIcon, PauseIcon, PencilSimpleIcon, PersonSimpleIcon, PillIcon,
  PlayIcon, PlusIcon, RepeatIcon, ShareNetworkIcon, ShieldCheckIcon, SkipForwardIcon, SneakerMoveIcon, StackIcon, StopIcon,
  SunHorizonIcon, SunIcon, TargetIcon, TimerIcon, TranslateIcon, TrashIcon, TrendDownIcon, TrendUpIcon, TrophyIcon,
  UploadSimpleIcon, UserIcon, WalletIcon, WarningIcon, XIcon, type Icon as PIcon, type IconWeight,
} from 'phosphor-react-native';
import type { StyleProp, ViewStyle } from 'react-native';

const REGISTRY: Record<string, PIcon> = {
  alarm: AlarmIcon, archive: ArchiveIcon, 'arrow-counter-clockwise': ArrowCounterClockwiseIcon, 'arrow-left': ArrowLeftIcon,
  'arrow-right': ArrowRightIcon, 'arrow-up-right': ArrowUpRightIcon, barbell: BarbellIcon, bell: BellIcon, 'book-open': BookOpenIcon,
  brain: BrainIcon, briefcase: BriefcaseIcon, 'calendar-check': CalendarCheckIcon, 'caret-down': CaretDownIcon,
  'caret-right': CaretRightIcon, 'caret-up': CaretUpIcon, 'chart-bar': ChartBarIcon, check: CheckIcon, 'check-square': CheckSquareIcon,
  'clock-counter-clockwise': ClockCounterClockwiseIcon, 'cloud-slash': CloudSlashIcon, 'device-mobile': DeviceMobileIcon,
  'dots-three-vertical': DotsThreeVerticalIcon, 'download-simple': DownloadSimpleIcon, drop: DropIcon, 'file-code': FileCodeIcon,
  'file-zip': FileZipIcon, fire: FireIcon, flag: FlagIcon, 'flower-lotus': FlowerLotusIcon, 'hand-heart': HandHeartIcon,
  'hard-drives': HardDrivesIcon, hash: HashIcon, heartbeat: HeartbeatIcon, image: ImageIcon, info: InfoIcon, lifebuoy: LifebuoyIcon,
  lightning: LightningIcon, 'list-checks': ListChecksIcon, lock: LockIcon, 'magnifying-glass': MagnifyingGlassIcon, medal: MedalIcon,
  minus: MinusIcon, moon: MoonIcon, note: NoteIcon, notebook: NotebookIcon, palette: PaletteIcon, pause: PauseIcon,
  'pencil-simple': PencilSimpleIcon, 'person-simple': PersonSimpleIcon, pill: PillIcon, play: PlayIcon, plus: PlusIcon, repeat: RepeatIcon,
  'share-network': ShareNetworkIcon, 'shield-check': ShieldCheckIcon, 'skip-forward': SkipForwardIcon, 'sneaker-move': SneakerMoveIcon,
  stack: StackIcon, stop: StopIcon, 'sun-horizon': SunHorizonIcon, sun: SunIcon, target: TargetIcon, timer: TimerIcon,
  translate: TranslateIcon, trash: TrashIcon, 'trend-down': TrendDownIcon, 'trend-up': TrendUpIcon, trophy: TrophyIcon,
  'upload-simple': UploadSimpleIcon, user: UserIcon, wallet: WalletIcon, warning: WarningIcon, x: XIcon,
};

export const ICON_NAMES = Object.keys(REGISTRY);

export function Icon({ name, size = 16, color, weight = 'regular', style }: { name: string; size?: number; color: string; weight?: IconWeight; style?: StyleProp<ViewStyle> }) {
  const C = REGISTRY[name] ?? CheckIcon;
  return <C size={size} color={color} weight={weight} style={style} />;
}
