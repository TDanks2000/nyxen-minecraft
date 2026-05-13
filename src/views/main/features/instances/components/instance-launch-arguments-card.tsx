import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/views/main/components/ui/card";
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@/views/main/components/ui/field";
import { Input } from "@/views/main/components/ui/input";
import { Textarea } from "@/views/main/components/ui/textarea";

type InstanceLaunchArgumentsCardProps = {
  gameArgsText: string;
  javaArgsText: string;
  javaExecutable: string;
  onGameArgsTextChange: (value: string) => void;
  onJavaArgsTextChange: (value: string) => void;
  onJavaExecutableChange: (value: string) => void;
};

export function InstanceLaunchArgumentsCard({
  gameArgsText,
  javaArgsText,
  javaExecutable,
  onGameArgsTextChange,
  onJavaArgsTextChange,
  onJavaExecutableChange,
}: InstanceLaunchArgumentsCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Advanced Launch Arguments</CardTitle>
        <CardDescription>
          Put one argument per line. Empty lines are ignored.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <FieldGroup className="grid gap-4 lg:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="java-executable">Java Executable</FieldLabel>
            <Input
              id="java-executable"
              onChange={(event) => onJavaExecutableChange(event.target.value)}
              placeholder="Managed by Nyxen"
              value={javaExecutable}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="java-args">Java Arguments</FieldLabel>
            <Textarea
              id="java-args"
              onChange={(event) => onJavaArgsTextChange(event.target.value)}
              placeholder="-XX:+UseG1GC"
              value={javaArgsText}
            />
          </Field>
          <Field className="lg:col-span-2">
            <FieldLabel htmlFor="game-args">Game Arguments</FieldLabel>
            <Textarea
              id="game-args"
              onChange={(event) => onGameArgsTextChange(event.target.value)}
              placeholder="--width&#10;1280"
              value={gameArgsText}
            />
          </Field>
        </FieldGroup>
      </CardContent>
    </Card>
  );
}
