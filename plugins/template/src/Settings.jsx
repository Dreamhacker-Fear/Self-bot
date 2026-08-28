import { React } from "@vendetta/metro/common";
import { General, Forms } from "@vendetta/ui/components";
import { storage } from "@vendetta/plugin";

const { ScrollView } = General;
const { FormSection, FormSwitchRow, FormDivider } = Forms;

const COMMAND_LIST = [
    "avatar",
    "roll",
    "8ball",
    "coinflip",
    "color",
    "choose",
    "myid",
    "timestamp",
    "remindme",
    "petpet",
    "triggered",
    "deepfry",
];

function loadEnabled() {
    storage.enabledCommands = storage.enabledCommands ?? Object.fromEntries(
        COMMAND_LIST.map((name) => [name, true])
    );
    return storage.enabledCommands;
}

export default function Settings() {
    const [enabled, setEnabled] = React.useState(loadEnabled());

    const toggle = (name, value) => {
        const merged = { ...enabled, [name]: value };
        setEnabled(merged);
        storage.enabledCommands = merged;
    };

    return (
        <ScrollView>
            <FormSection title="Commands">
                {COMMAND_LIST.map((name, i) => (
                    <React.Fragment key={name}>
                        <FormSwitchRow
                            label={`/${name}`}
                            value={enabled[name]}
                            onValueChange={(v) => toggle(name, v)}
                        />
                        {i < COMMAND_LIST.length - 1 && <FormDivider />}
                    </React.Fragment>
                ))}
            </FormSection>
        </ScrollView>
    );
}
