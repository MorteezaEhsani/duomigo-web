'use client';

const skillTypes = [
  { id: 'speaking', label: 'Speaking' },
  { id: 'writing', label: 'Writing' },
  { id: 'listening', label: 'Listening' },
  { id: 'reading', label: 'Reading' },
];

interface SidebarProps {
  activeSection: string;
  onSectionClick: (sectionId: string) => void;
}

export default function Sidebar({ activeSection, onSectionClick }: SidebarProps) {
  console.log('Sidebar rendering with activeSection:', activeSection);

  return (
    <>
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex w-64 bg-white border-r border-gray-200 p-6 flex-col">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Duomigo</h1>
        </div>

        <nav className="flex-1">
          <ul className="space-y-2">
            {skillTypes.map((skill) => (
              <li key={skill.id}>
                <button
                  onClick={() => onSectionClick(skill.id)}
                  className={`w-full text-left px-4 py-3 rounded-lg transition-colors duration-200 ${
                    activeSection === skill.id
                      ? 'bg-amber-100 text-amber-900 font-semibold'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {skill.label}
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
        <ul className="flex justify-around items-center h-16 px-2">
          {skillTypes.map((skill) => (
            <li key={skill.id} className="flex-1">
              <button
                onClick={() => onSectionClick(skill.id)}
                className={`w-full h-full flex flex-col items-center justify-center gap-1 transition-colors duration-200 ${
                  activeSection === skill.id
                    ? 'text-amber-600'
                    : 'text-gray-600'
                }`}
              >
                <span className="text-xs font-medium">{skill.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}
