// The whole UI kit in one file: text, layout, buttons, badges, stat tiles and
// the bar mark. Kept together because each piece is small and they are always
// imported as a set. Screens should not need raw <View>/<Text> styling beyond
// these.
//
// This and ./tokens are the shared design system, imported by both apps via the
// `melda-shared/ui/components` and `melda-shared/ui/tokens` subpaths. They ship
// as SOURCE, not compiled into dist: this file pulls in react-native,
// react-native-svg and ./icons (which only the apps have), so src/ui is excluded
// from the pure `tsc` build and the backend, which imports only the bare
// `melda-shared` root, never loads it. Each app's Metro bundler transpiles this
// .tsx the same way it does the app's own screens, so no build step is needed here.

import { type ReactNode, useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  type TextStyle,
  View,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SvgXml } from 'react-native-svg';
import { color, font, radius, sp, type Tone, toneStyle, weight } from './tokens';
import { EMPTY_STATE_XML, ICON_XML, type EmptyStateArt, type IconName } from './icons';

// react-native-web adds `hovered`/`focused` to the Pressable state at runtime,
// but React Native's own type only declares `pressed`. Widen it here so screens
// can read all three type-safely (they stay undefined on native).
export type PressState = { pressed: boolean; hovered?: boolean; focused?: boolean };

// --- icons -------------------------------------------------------------------
// Screens name icons by role, not glyph; the per-glyph SVG set lives in ./icons
// and renders through react-native-svg (no icon font, so web first paint never
// flashes blank glyphs). `#1439FF` in each asset is the swappable brand accent
// the Icon component rewrites to the requested colour at render time.
export type { IconName, EmptyStateArt };

export function Icon(props: { name: IconName; size?: number; color?: string }) {
  const { name, size = 18, color: c = color.ink } = props;
  const xml = ICON_XML[name].replace(/#1439FF/g, c);
  return <SvgXml xml={xml} width={size} height={size} />;
}

// --- text --------------------------------------------------------------------
type TxtVariant = 'display' | 'h1' | 'h2' | 'h3' | 'body' | 'small' | 'tiny';

const VARIANT: Record<TxtVariant, TextStyle> = {
  display: { fontSize: font.display, lineHeight: font.display * 1.1, fontWeight: weight.bold },
  h1: { fontSize: font.h1, lineHeight: font.h1 * 1.2, fontWeight: weight.bold },
  h2: { fontSize: font.h2, lineHeight: font.h2 * 1.25, fontWeight: weight.semibold },
  h3: { fontSize: font.h3, lineHeight: font.h3 * 1.3, fontWeight: weight.semibold },
  body: { fontSize: font.body, lineHeight: font.body * 1.45 },
  small: { fontSize: font.small, lineHeight: font.small * 1.4 },
  tiny: { fontSize: font.tiny, lineHeight: font.tiny * 1.35 },
};

export function Txt(props: {
  children: ReactNode;
  variant?: TxtVariant;
  c?: string;
  w?: TextStyle['fontWeight'];
  center?: boolean;
  style?: TextStyle;
  numberOfLines?: number;
  /** Element id (id= on web) so an aria-labelledby can point at this text. */
  nativeID?: string;
}) {
  const { children, variant = 'body', c = color.ink, w, center, style, numberOfLines, nativeID } =
    props;
  return (
    <Text
      nativeID={nativeID}
      numberOfLines={numberOfLines}
      style={[
        VARIANT[variant],
        { color: c },
        w ? { fontWeight: w } : null,
        center ? { textAlign: 'center' } : null,
        style,
      ]}
    >
      {children}
    </Text>
  );
}

// --- layout ------------------------------------------------------------------
export function Screen(props: {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  scroll?: boolean;
  right?: ReactNode;
  maxWidth?: number;
  onRefresh?: () => Promise<unknown> | void;
}) {
  const { children, title, subtitle, scroll = true, right, maxWidth = 760, onRefresh } = props;
  const [refreshing, setRefreshing] = useState(false);
  // Pull-to-refresh: run the screen's reload (useApi's, which resolves when the
  // fetch lands) and hold the spinner until it does. On web the pull gesture is
  // inert, so this is a native affordance; nothing renders when onRefresh is unset.
  const handleRefresh = useCallback(async () => {
    if (!onRefresh) return;
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  }, [onRefresh]);
  const header =
    title != null ? (
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Txt variant="h1">{title}</Txt>
          {subtitle ? (
            <Txt variant="small" c={color.inkMuted} style={{ marginTop: 2 }}>
              {subtitle}
            </Txt>
          ) : null}
        </View>
        {right}
      </View>
    ) : null;

  // One centred column capped at maxWidth, so on the teacher's tablet/desktop the
  // content stops stretching edge-to-edge into an unreadable ribbon. On phones the
  // viewport is narrower than the cap, so width:100% wins and nothing changes.
  const body = (
    <View style={[styles.content, { maxWidth }, scroll ? null : { flex: 1 }]}>
      {header}
      {children}
    </View>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={styles.scrollOuter}
          showsVerticalScrollIndicator={false}
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={color.accent}
                colors={[color.accent]}
              />
            ) : undefined
          }
        >
          {body}
        </ScrollView>
      ) : (
        <View style={[styles.scrollOuter, { flex: 1 }]}>{body}</View>
      )}
    </SafeAreaView>
  );
}

export function Row(props: {
  children: ReactNode;
  gap?: number;
  style?: ViewStyle;
  wrap?: boolean;
}) {
  const { children, gap = sp.sm, style, wrap } = props;
  return (
    <View
      style={[
        { flexDirection: 'row', alignItems: 'center', gap },
        wrap ? { flexWrap: 'wrap' } : null,
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function Card(props: { children: ReactNode; onPress?: () => void; style?: ViewStyle }) {
  const { children, onPress, style } = props;
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        style={({ pressed, hovered, focused }: PressState) => [
          styles.card,
          style,
          hovered ? styles.hovered : null,
          focused ? styles.focused : null,
          pressed ? styles.pressed : null,
        ]}
      >
        {children}
      </Pressable>
    );
  }
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Divider() {
  return <View style={styles.divider} />;
}

// --- text input --------------------------------------------------------------
// One field for every form in the app: an optional uppercase label above a
// bordered input, single- or multi-line. Editable AI drafts, the topic/param
// fields and both login forms all render through this, so the input styling and
// the form props (secure entry, autofill hints, keyboard type) live in one place.
export function Input(props: {
  value: string;
  onChangeText: (text: string) => void;
  label?: string;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: TextInputProps['keyboardType'];
  secureTextEntry?: boolean;
  autoCapitalize?: TextInputProps['autoCapitalize'];
  autoCorrect?: boolean;
  /** Autofill hint (web + native): "email", "current-password", "name"... */
  autoComplete?: TextInputProps['autoComplete'];
  /** iOS autofill hint, e.g. "emailAddress", "password". */
  textContentType?: TextInputProps['textContentType'];
  editable?: boolean;
  onSubmitEditing?: () => void;
  /** Element id (id= on web) so an aria-labelledby can name the field. */
  nativeID?: string;
  style?: ViewStyle;
}) {
  const {
    value,
    onChangeText,
    label,
    placeholder,
    multiline,
    keyboardType,
    secureTextEntry,
    autoCapitalize,
    autoCorrect,
    autoComplete,
    textContentType,
    editable,
    onSubmitEditing,
    nativeID,
    style,
  } = props;
  return (
    <View style={style}>
      {label ? (
        <Txt
          variant="tiny"
          c={color.inkMuted}
          w={weight.semibold}
          style={{ textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: sp.xs }}
        >
          {label}
        </Txt>
      ) : null}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={color.inkMuted}
        multiline={multiline}
        keyboardType={keyboardType}
        secureTextEntry={secureTextEntry}
        autoCapitalize={autoCapitalize}
        autoCorrect={autoCorrect}
        autoComplete={autoComplete}
        textContentType={textContentType}
        editable={editable}
        returnKeyType={onSubmitEditing ? 'done' : undefined}
        onSubmitEditing={onSubmitEditing}
        nativeID={nativeID}
        accessibilityLabel={label ?? placeholder}
        style={[styles.input, multiline ? styles.inputMultiline : null]}
      />
    </View>
  );
}

// --- avatar ------------------------------------------------------------------
export function Avatar(props: { initials: string; tone?: Tone; size?: number }) {
  const { initials, tone = 'accent', size = 40 } = props;
  const { bg, fg } = toneStyle(tone);
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: bg,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text style={{ color: fg, fontWeight: weight.bold, fontSize: size * 0.36 }}>{initials}</Text>
    </View>
  );
}

// --- badges ------------------------------------------------------------------
export function Badge(props: { label: string; tone?: Tone; dot?: boolean }) {
  const { label, tone = 'neutral', dot } = props;
  const { bg, fg } = toneStyle(tone);
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      {dot ? <View style={[styles.dot, { backgroundColor: fg }]} /> : null}
      <Text style={{ color: fg, fontSize: font.tiny, fontWeight: weight.semibold }}>{label}</Text>
    </View>
  );
}

// --- buttons -----------------------------------------------------------------
export function Button(props: {
  title: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'md' | 'sm';
  loading?: boolean;
  disabled?: boolean;
  icon?: IconName;
  style?: ViewStyle;
}) {
  const {
    title,
    onPress,
    variant = 'primary',
    size = 'md',
    loading,
    disabled,
    icon,
    style,
  } = props;
  const isDisabled = disabled || loading;
  const base: ViewStyle[] = [
    styles.btn,
    size === 'sm' ? styles.btnSm : null,
    variant === 'primary' ? styles.btnPrimary : null,
    variant === 'secondary' ? styles.btnSecondary : null,
    variant === 'ghost' ? styles.btnGhost : null,
    isDisabled ? { opacity: 0.5 } : null,
    style,
  ].filter(Boolean) as ViewStyle[];
  const fg =
    variant === 'primary' ? color.inkInverse : variant === 'secondary' ? color.ink : color.accent;
  return (
    <Pressable
      disabled={isDisabled}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      style={({ pressed, hovered, focused }: PressState) => [
        ...base,
        !isDisabled && hovered ? styles.hovered : null,
        !isDisabled && focused ? styles.focused : null,
        pressed && !isDisabled ? styles.pressed : null,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} size="small" />
      ) : (
        <>
          {icon ? <Icon name={icon} size={size === 'sm' ? 16 : 18} color={fg} /> : null}
          <Text
            style={{
              color: fg,
              fontWeight: weight.semibold,
              fontSize: size === 'sm' ? font.small : font.body,
            }}
          >
            {title}
          </Text>
        </>
      )}
    </Pressable>
  );
}

// --- stat tile ---------------------------------------------------------------
export function StatTile(props: {
  label: string;
  value: string;
  caption?: string;
  tone?: Tone;
  onPress?: () => void;
  style?: ViewStyle;
}) {
  const { label, value, caption, tone, onPress, style } = props;
  const accentFg = tone ? toneStyle(tone).fg : color.ink;
  return (
    <Card onPress={onPress} style={StyleSheet.flatten([{ flex: 1, gap: 2 }, style])}>
      <Txt
        variant="tiny"
        c={color.inkMuted}
        w={weight.semibold}
        style={{ textTransform: 'uppercase', letterSpacing: 0.5 }}
      >
        {label}
      </Txt>
      <Txt variant="h1" c={accentFg}>
        {value}
      </Txt>
      {caption ? (
        <Txt variant="small" c={color.inkMuted}>
          {caption}
        </Txt>
      ) : null}
    </Card>
  );
}

// --- section title -----------------------------------------------------------
export function SectionTitle(props: { title: string; caption?: string; action?: ReactNode }) {
  return (
    <View style={styles.sectionTitle}>
      <View style={{ flex: 1 }}>
        <Txt variant="h3">{props.title}</Txt>
        {props.caption ? (
          <Txt variant="small" c={color.inkMuted}>
            {props.caption}
          </Txt>
        ) : null}
      </View>
      {props.action}
    </View>
  );
}

// --- bar mark ----------------------------------------------------------------
// A single horizontal bar: label, a track, a baseline-anchored fill with a
// rounded data-end, and the value printed in ink (never on the fill, so
// contrast never depends on the bar colour). Tapping drills in - the touch
// equivalent of a chart tooltip.
export function BarRow(props: {
  label: string;
  value: number;
  max?: number;
  display?: string;
  fill?: string;
  sub?: string;
  onPress?: () => void;
}) {
  const { label, value, max = 100, display, fill = color.struggle, sub, onPress } = props;
  const pct = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  const inner = (
    <View style={{ gap: 6, paddingVertical: sp.sm }}>
      <View style={styles.barLabelRow}>
        <Txt variant="small" w={weight.medium} numberOfLines={1} style={{ flex: 1 }}>
          {label}
        </Txt>
        <Txt variant="small" w={weight.bold}>
          {display ?? String(value)}
        </Txt>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${pct * 100}%`, backgroundColor: fill }]} />
      </View>
      {sub ? (
        <Txt variant="tiny" c={color.inkMuted}>
          {sub}
        </Txt>
      ) : null}
    </View>
  );
  return onPress ? (
    <Pressable
      onPress={onPress}
      accessible
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${display ?? String(value)}${sub ? `, ${sub}` : ''}`}
      style={({ pressed, hovered, focused }: PressState) => [
        hovered ? styles.hovered : null,
        focused ? styles.focused : null,
        pressed ? styles.pressed : null,
      ]}
    >
      {inner}
    </Pressable>
  ) : (
    inner
  );
}

// --- loading -----------------------------------------------------------------
// Fills its container with a centred spinner while a screen's first fetch is in
// flight. Screens render this instead of a half-empty layout.
export function Loading(props: { label?: string }) {
  return (
    <View style={styles.loading}>
      <ActivityIndicator color={color.accent} />
      {props.label ? (
        <Txt variant="small" c={color.inkMuted}>
          {props.label}
        </Txt>
      ) : null}
    </View>
  );
}

// --- empty state -------------------------------------------------------------
export function EmptyState(props: {
  title: string;
  body?: string;
  /** One of the six illustrations in ./icons (single-fill brand accent). */
  art?: EmptyStateArt;
  /** Fallback glyph (the new brand icon set) for states without bespoke art. */
  icon?: IconName;
}) {
  const { title, body, art, icon } = props;
  return (
    <View style={styles.empty}>
      {art ? (
        <SvgXml xml={EMPTY_STATE_XML[art]} width={120} height={120} />
      ) : icon ? (
        <Icon name={icon} size={40} color={color.inkMuted} />
      ) : null}
      <Txt variant="h3" center>
        {title}
      </Txt>
      {body ? (
        <Txt variant="small" c={color.inkMuted} center>
          {body}
        </Txt>
      ) : null}
    </View>
  );
}

// --- error state -------------------------------------------------------------
// A failed fetch. Same centred layout as EmptyState, plus a retry that re-runs
// the screen's fetcher (useApi.reload) - so recovery is one tap, not a
// navigate-away-and-back.
export function ErrorState(props: { title?: string; message?: string; onRetry?: () => void }) {
  const { title = 'Something went wrong', message, onRetry } = props;
  return (
    <View style={styles.empty}>
      <SvgXml xml={EMPTY_STATE_XML.error.replace(/#1439FF/g, color.warnInk)} width={72} height={72} />
      <Txt variant="h3" center>
        {title}
      </Txt>
      {message ? (
        <Txt variant="small" c={color.inkMuted} center>
          {message}
        </Txt>
      ) : null}
      {onRetry ? <Button title="Try again" variant="secondary" onPress={onRetry} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: color.appBg },
  scrollOuter: { padding: sp.lg, paddingBottom: sp.xxl, alignItems: 'center' },
  content: { width: '100%', gap: sp.lg },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: sp.sm },
  card: {
    backgroundColor: color.card,
    borderRadius: radius.lg,
    padding: sp.lg,
    borderWidth: 1,
    borderColor: color.border,
    // boxShadow replaces the deprecated shadow* props / elevation: it renders on
    // react-native-web and on new-architecture native (both apps run
    // newArchEnabled). ponytail: if an app ever turns the new arch off, Android
    // loses the shadow and needs `elevation` back.
    boxShadow: '0px 3px 10px rgba(11, 18, 32, 0.05)',
  },
  pressed: { opacity: 0.7 },
  // Web-only affordances (react-native-web): a light dim on hover and a keyboard
  // focus ring. boxShadow follows the element's border-radius, so it hugs rounded
  // cards and square bar rows alike, with no layout shift.
  hovered: { opacity: 0.85 },
  focused: { boxShadow: `0 0 0 2px ${color.accent}` },
  divider: { height: 1, backgroundColor: color.border },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.md,
    paddingHorizontal: sp.md,
    paddingVertical: sp.sm,
    fontSize: font.body,
    color: color.ink,
    backgroundColor: color.appBg,
  },
  inputMultiline: { minHeight: 92, paddingTop: sp.sm, textAlignVertical: 'top' },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: sp.sm,
    paddingVertical: 4,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
  },
  dot: { width: 7, height: 7, borderRadius: radius.pill },
  btn: {
    minHeight: 48,
    paddingHorizontal: sp.lg,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: sp.xs,
  },
  btnSm: { minHeight: 38, paddingHorizontal: sp.md, borderRadius: radius.sm },
  btnPrimary: { backgroundColor: color.accent },
  btnSecondary: { backgroundColor: color.card, borderWidth: 1, borderColor: color.border },
  btnGhost: { backgroundColor: 'transparent' },
  sectionTitle: { flexDirection: 'row', alignItems: 'center', gap: sp.sm, marginBottom: sp.xs },
  barLabelRow: { flexDirection: 'row', alignItems: 'center', gap: sp.sm },
  track: {
    height: 10,
    borderRadius: radius.pill,
    backgroundColor: color.track,
    overflow: 'hidden',
  },
  fill: { height: 10, minWidth: 6, borderRadius: radius.pill },
  empty: { alignItems: 'center', gap: sp.sm, padding: sp.xl },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: sp.md,
    padding: sp.xl,
    backgroundColor: color.appBg,
  },
});
