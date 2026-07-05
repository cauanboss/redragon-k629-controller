export interface RGBColor {
  r: number;
  g: number;
  b: number;
}

export interface KeyDef {
  id: string;
  label: string;
  width: number;
}

export interface RowDef {
  keys: Array<KeyDef | null>;
}

export interface LayoutMessage {
  type: 'layout';
  keys: Array<{
    id: string;
    label: string;
    position: { row: number; col: number };
    width?: number;
    color?: RGBColor;
  }>;
}

export interface KeyColorMessage {
  type: 'key_color';
  keyId: string;
  color: RGBColor;
}

export interface EffectActiveMessage {
  type: 'effect_active';
  effect: string;
}

export interface ProfileDataMessage {
  type: 'profile_data';
  name: string;
  profile: {
    name: string;
    colors: Record<string, RGBColor>;
    effect?: string;
    brightness?: number;
    speed?: number;
  };
}

export interface ProfileListMessage {
  type: 'profile_list';
  profiles: Array<{ name: string; builtin: boolean }>;
}

export interface ProfileSavedMessage {
  type: 'profile_saved';
  name: string;
}

export interface ProfileDeletedMessage {
  type: 'profile_deleted';
  name: string;
}

export interface ErrorMessage {
  type: 'error';
  message: string;
}

export type ServerMessage =
  | LayoutMessage
  | KeyColorMessage
  | EffectActiveMessage
  | ProfileListMessage
  | ProfileDataMessage
  | ProfileSavedMessage
  | ProfileDeletedMessage
  | ErrorMessage;

export interface ProfileListItem {
  name: string;
  builtin: boolean;
}
