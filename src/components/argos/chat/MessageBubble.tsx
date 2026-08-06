/**
 * MessageBubble — una burbuja del chat ARGOS (MB-21 Pieza 4).
 * Extraída de argos-chat.tsx; colores desde brand.ts, tipografía de theme.
 */
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Markdown from 'react-native-markdown-display';
import { ArgosMark } from '@/src/components/argos/ArgosMark';
import type { ArgosMessage } from '@/src/services/argos-service';
import { ATP_BRAND, BG, BORDER, ELEVATION, SURFACES, TEXT_COLORS, withOpacity } from '@/src/constants/brand';
import { Fonts, FontSizes } from '@/constants/theme';

// Texto de lectura del chat: blanco atenuado (el primario puro deslumbra en
// párrafos largos sobre negro).
const BODY = withOpacity(ATP_BRAND.white, 0.89);

// Rule override de react-native-markdown-display: hace el texto seleccionable
// (la lib no expone selectable como prop directa).
const MARKDOWN_RULES = {
  text: (node: any, _children: any, _parent: any, styles: any, inheritedStyles: any = {}) => (
    <Text key={node.key} selectable style={[inheritedStyles, styles.text]}>
      {node.content}
    </Text>
  ),
};

const MARKDOWN_STYLES = {
  body: { color: BODY, fontSize: FontSizes.md, lineHeight: 21 },
  heading2: { color: ATP_BRAND.lime, fontSize: FontSizes.lg, fontWeight: '800' as const, marginTop: 12, marginBottom: 6 },
  heading3: { color: ATP_BRAND.lime, fontSize: FontSizes.md, fontWeight: '700' as const, marginTop: 10, marginBottom: 4 },
  strong: { color: TEXT_COLORS.primary, fontWeight: '700' as const },
  bullet_list: { marginLeft: 8 },
  list_item: { color: BODY, marginBottom: 4 },
  hr: { backgroundColor: SURFACES.disabled, height: 0.5, marginVertical: 12 },
  em: { color: withOpacity(ATP_BRAND.white, 0.8), fontStyle: 'italic' as const },
  paragraph: { color: BODY, fontSize: FontSizes.md, lineHeight: 21, marginBottom: 8 },
  // Dark-mode para TODO elemento con default claro de la librería
  // (blockquote, code y fences renderizan caja casi blanca / ilegible por defecto).
  blockquote: {
    backgroundColor: ELEVATION[1].bg,
    borderLeftColor: ATP_BRAND.lime,
    borderLeftWidth: 3,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginVertical: 8,
  },
  code_inline: {
    backgroundColor: SURFACES.cardLight,
    color: BODY,
    borderWidth: 0,
    fontSize: 13,
  },
  code_block: {
    backgroundColor: ELEVATION[1].bg,
    color: BODY,
    borderColor: ELEVATION[1].border,
    borderWidth: 0.5,
    borderRadius: 8,
    padding: 12,
  },
  fence: {
    backgroundColor: ELEVATION[1].bg,
    color: BODY,
    borderColor: ELEVATION[1].border,
    borderWidth: 0.5,
    borderRadius: 8,
    padding: 12,
  },
};

/** F2.3: etiqueta del separador temporal entre mensajes (>5 min de gap). */
export function timestampLabel(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const time = d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  if (sameDay) return time;
  return `${d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })} · ${time}`;
}

interface Props {
  msg: ArgosMessage;
  showTimestamp: boolean;
  onLongPress: () => void;
}

export function MessageBubble({ msg, showTimestamp, onLongPress }: Props) {
  const isUser = msg.role === 'user';
  return (
    <View style={[s.wrap, { alignItems: isUser ? 'flex-end' : 'flex-start' }]}>
      {showTimestamp && msg.ts != null && (
        <Text style={s.timestamp}>{timestampLabel(msg.ts)}</Text>
      )}
      {!isUser && (
        <View style={s.argosTag}>
          <View style={s.argosMarkBg}>
            <ArgosMark size={12} />
          </View>
          <Text style={s.argosTagText}>ARGOS</Text>
        </View>
      )}
      {/* Burbuja — selectable; long-press → menú propio (Copiar / Editar) */}
      <Pressable
        onLongPress={onLongPress}
        delayLongPress={350}
        style={[s.bubble, isUser ? s.bubbleUser : s.bubbleArgos]}
      >
        {isUser ? (
          <Text selectable style={s.userText}>{msg.content}</Text>
        ) : (
          <Markdown style={MARKDOWN_STYLES} rules={MARKDOWN_RULES}>
            {msg.content}
          </Markdown>
        )}
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { marginBottom: 12 },
  timestamp: {
    alignSelf: 'center',
    color: withOpacity(ATP_BRAND.white, 0.33),
    fontSize: FontSizes.xs,
    fontFamily: Fonts.regular,
    letterSpacing: 1,
    marginVertical: 8,
  },
  argosTag: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  argosMarkBg: {
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: withOpacity(ATP_BRAND.lime, 0.15),
    justifyContent: 'center', alignItems: 'center',
  },
  argosTagText: {
    color: ATP_BRAND.lime, fontSize: FontSizes.xs, fontFamily: Fonts.bold,
  },
  bubble: { maxWidth: '85%', borderRadius: 18, padding: 14 },
  bubbleUser: {
    backgroundColor: ATP_BRAND.lime,
    borderBottomRightRadius: 4,
  },
  bubbleArgos: {
    backgroundColor: BG.input,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: BORDER.card,
  },
  userText: {
    color: TEXT_COLORS.onAccent, fontSize: FontSizes.md,
    fontFamily: Fonts.regular, lineHeight: 21,
  },
});
