
type SidebarProps = {
    title?: string;
}

export const Sidebar = ({title = "AAA"}: SidebarProps) => {

    return (
        <aside>
            <h2>{title}</h2>
        </aside>
    );
}