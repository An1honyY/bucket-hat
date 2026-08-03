import { useState } from "react";
import { ScrollView, Switch, Text, TextInput, View } from "react-native";
import WarmthSlider from "../../components/WarmthSlider";
import TagChips, { ACCESSORY_TAG_OPTIONS, BASE_TAG_OPTIONS, BOTTOMS_TAG_OPTIONS, LAYER_TAG_OPTIONS } from "../../components/TagChips";
import SingleSelect from "../../components/SingleSelect";
import PhotoPicker from "../../components/PhotoPicker";
import FormRow from "../../components/FormRow";
import FormSection from "../../components/FormSection";
import FormActions from "../../components/FormActions";
import { newId } from "../../db/rowMapping";
import useTheme from "../../theme/useTheme";
import useCommonStyles from "../../theme/commonStyles";
import type { ClothingItem, ClothingType } from "../../types";

const TYPE_OPTIONS: ClothingType[] = ["jacket", "midlayer", "base", "bottoms", "accessory"];

function tagOptionsFor(type: ClothingType): readonly string[] {
  if (type === "accessory") return ACCESSORY_TAG_OPTIONS;
  if (type === "bottoms") return BOTTOMS_TAG_OPTIONS;
  if (type === "base") return BASE_TAG_OPTIONS;
  if (type === "jacket" || type === "midlayer") return LAYER_TAG_OPTIONS;
  return [];
}

interface Props {
  initial?: ClothingItem;
  // §9.6 — when GearRecommendationCard's fallback text sent the user here
  // for a specific missing slot, pre-set the type instead of always
  // defaulting to "jacket". Ignored once `initial` is set (editing).
  initialType?: ClothingType;
  onSubmit: (item: ClothingItem) => void;
  onCancel: () => void;
  onDelete?: () => void;
  onMarkUnavailable?: () => void;
}

export default function ClothingForm({ initial, initialType, onSubmit, onCancel, onDelete, onMarkUnavailable }: Props) {
  const theme = useTheme();
  const styles = useCommonStyles();
  const [id] = useState(() => initial?.id ?? newId());
  const [name, setName] = useState(initial?.name ?? "");
  const [type, setType] = useState<ClothingType>(initial?.type ?? initialType ?? "jacket");
  const [warmth, setWarmth] = useState(initial?.warmth ?? 5);
  const [waterproof, setWaterproof] = useState(initial?.waterproof ?? false);
  const [windproof, setWindproof] = useState(initial?.windproof ?? false);
  const [packable, setPackable] = useState(initial?.packable ?? false);
  const [substitutesForMidlayer, setSubstitutesForMidlayer] = useState(initial?.substitutesForMidlayer ?? false);
  const [tags, setTags] = useState<string[]>(initial?.tags ?? []);
  const [photoUri, setPhotoUri] = useState<string | undefined>(initial?.photoUri);

  const tagOptions = tagOptionsFor(type);
  const canSubmit = name.trim().length > 0;

  function handleSubmit() {
    onSubmit({
      ...initial,
      id,
      name: name.trim(),
      type,
      warmth,
      waterproof,
      windproof,
      packable,
      substitutesForMidlayer: type === "jacket" ? substitutesForMidlayer : undefined,
      tags: tagOptions.length > 0 && tags.length > 0 ? tags : undefined,
      photoUri,
    });
  }

  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <FormSection title="Basics">
        <PhotoPicker itemId={id} photoUri={photoUri} onChange={setPhotoUri} />
        <View>
          <Text style={styles.fieldLabel}>Name</Text>
          <TextInput
            style={styles.input}
            placeholderTextColor={theme.textSecondary}
            value={name}
            onChangeText={setName}
            placeholder="Blue rain shell"
          />
        </View>
      </FormSection>

      <FormSection title="Type & warmth">
        <View>
          <Text style={styles.fieldLabel}>Type</Text>
          <SingleSelect options={TYPE_OPTIONS} value={type} onChange={setType} />
        </View>
        <View>
          <Text style={styles.fieldLabel}>Warmth</Text>
          <WarmthSlider
            value={warmth}
            onChange={setWarmth}
            showSubstitutesToggle={type === "jacket"}
            substitutesForMidlayer={substitutesForMidlayer}
            onToggleSubstitutes={setSubstitutesForMidlayer}
          />
        </View>
      </FormSection>

      <FormSection title="Properties">
        <FormRow label="Waterproof">
          <Switch value={waterproof} onValueChange={setWaterproof} />
        </FormRow>
        <FormRow label="Windproof">
          <Switch value={windproof} onValueChange={setWindproof} />
        </FormRow>
        <FormRow label="Packable">
          <Switch value={packable} onValueChange={setPackable} />
        </FormRow>
        {tagOptions.length > 0 && (
          <View>
            <Text style={styles.fieldLabel}>Tags</Text>
            <TagChips options={tagOptions} selected={tags} onChange={setTags} />
          </View>
        )}
      </FormSection>

      <FormActions
        onCancel={onCancel}
        onSubmit={handleSubmit}
        canSubmit={canSubmit}
        secondary={onMarkUnavailable ? { label: "Mark unavailable until…", onPress: onMarkUnavailable } : undefined}
        destructive={onDelete ? { label: "Delete item", onPress: onDelete } : undefined}
      />
    </ScrollView>
  );
}
