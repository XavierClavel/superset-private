import type { Meta, StoryObj } from "@storybook/react-vite";
import { LoopSpinner } from "./LoopSpinner";

const meta = {
	title: "Atoms/LoopSpinner",
	component: LoopSpinner,
} satisfies Meta<typeof LoopSpinner>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Looping: Story = {
	args: { className: "text-foreground/80" },
};

export const Enlarged: Story = {
	args: { className: "text-foreground/80" },
	render: (args) => (
		<div className="origin-top-left scale-[6]">
			<LoopSpinner {...args} />
		</div>
	),
};
