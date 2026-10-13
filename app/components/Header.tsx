// En-tête commun à toutes les pages : titre à gauche, menu ☰ à droite.

import Menu from "./Menu";

export default function Header({ title }: { title: string }) {
  return (
    <header className="flex items-center justify-between">
      <h1 className="text-xl font-bold">{title}</h1>
      <Menu />
    </header>
  );
}
