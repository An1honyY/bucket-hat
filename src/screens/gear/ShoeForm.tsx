import { useState } from "react";
import { ScrollView, Switch, Text, TextInput, View } from "react-native";
import SingleSelect from "../../components/SingleSelect";
import PhotoPicker from "../../components/PhotoPicker";
import FormRow from "../../components/FormRow";
import FormSection from "../../components/FormSection";
import FormActions from "../../components/FormActions";
import { newId } from "../../db/rowMapping";
import useTheme from "../../theme/useTheme";
import useCommonStyles from "../../theme/commonStyles";
import type { ShoeItem, ShoeType } from "../../types";

const TYPE_OPTIONS: ShoeType[] = ["sneaker", "boot", "sandal", "formal", "waterproof-boot"];
const GRIP_OPTIONS: ShoeItem["grip"][] = ["low", "med", "high"];

interface Props {
  initial?: ShoeItem;
  onSubmit: (item: ShoeItem) => void;
  onCancel: () => void;
  onDelete?: () => void;
  onMarkUnavailable?: () => void;
}

export default function ShoeForm({ initial, onSubmit, onCancel, onDelete, onMarkUnavailable }: Props) {
  const theme = useTheme();
  const styles = useCommonStyles();
  const [id] = useState(() => initial?.id ?? newId());
  const [name, setName] = useState(initial?.name ?? "");
  const [type, setType] = useState<ShoeType>(initial?.type ?? "sneaker");
  const [waterproof, setWaterproof] = useState(initial?.waterproof ?? false);
  const [grip, setGrip] = useState<ShoeItem["grip"]>(initial?.grip ?? "med");
  const [photoUri, setPhotoUri] = useState<string | undefined>(initial?.photoUri);

  const canSubmit = name.trim().length > 0;

  function handleSubmit() {
    onSubmit({ ...initial, id, name: name.trim(), type, waterproof, grip, photoUri });
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
            placeholder="Waterproof boots"
          />
        </View>
      </FormSection>

      <FormSection title="Details">
        <View>
          <Text style={styles.fieldLabel}>Type</Text>
          <SingleSelect options={TYPE_OPTIONS} value={type} onChange={setType} />
        </View>
        <FormRow label="Waterproof">
          <Switch value={waterproof} onValueChange={setWaterproof} />
        </FormRow>
        <View>
          <Text style={styles.fieldLabel}>Grip</Text>
          <SingleSelect options={GRIP_OPTIONS} value={grip} onChange={setGrip} />
        </View>
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
