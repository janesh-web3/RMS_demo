import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Button } from './ui/button';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from './ui/sheet';
import { ThemeToggle } from './theme-toggle';
import {
  LogOut,
  Home,
  Users,
  Settings,
  ChefHat,
  Receipt,
  BarChart3,
  Table as TablesIcon,
  UtensilsCrossed,
  ClipboardList,
  Menu as HamburgerIcon,
  Bell,
  User,
  UserCheck,
  DollarSign,
  TrendingUp
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const location = useLocation();

  const getNavigationItems = () => {
    if (!user) return [
      { name: 'Dashboard', href: '/', icon: Home, description: 'Overview & analytics' },
      { name: 'Orders', href: '/orders', icon: ClipboardList, description: 'View orders' },
    ];

    const commonItems = [
      { name: 'Dashboard', href: '/', icon: Home, description: 'Overview & analytics' },
    ];

    switch (user.role) {
      case 'Admin':
        return [
          ...commonItems,
          { name: 'Tables', href: '/tables', icon: TablesIcon, description: 'Manage restaurant tables' },
          { name: 'Menu', href: '/menu', icon: UtensilsCrossed, description: 'Menu items & pricing' },
          { name: 'Orders', href: '/orders', icon: ClipboardList, description: 'Order management' },
          { name: 'Billing', href: '/billing', icon: Receipt, description: 'Bills & payments' },
          { name: 'Customers', href: '/customers', icon: UserCheck, description: 'Customer & credit management' },
          { name: 'Expenses', href: '/expenses', icon: DollarSign, description: 'Expense tracking & budgets' },
          { name: 'Reports', href: '/reports', icon: BarChart3, description: 'Sales & analytics' },
          { name: 'Analytics', href: '/analytics', icon: TrendingUp, description: 'Business analytics & insights' },
          { name: 'Users', href: '/users', icon: Users, description: 'Staff management' },
        ];
      case 'Waiter':
        return [
          ...commonItems,
          { name: 'Tables', href: '/tables', icon: TablesIcon, description: 'Table status' },
          { name: 'Menu', href: '/menu', icon: UtensilsCrossed, description: 'View menu' },
          { name: 'Orders', href: '/orders', icon: ClipboardList, description: 'Take orders' },
        ];
      case 'Cashier':
        return [
          ...commonItems,
          { name: 'Orders', href: '/orders', icon: ClipboardList, description: 'View orders' },
          { name: 'Billing', href: '/billing', icon: Receipt, description: 'Process payments' },
          { name: 'Customers', href: '/customers', icon: UserCheck, description: 'Customer & credit management' },
          { name: 'Expenses', href: '/expenses', icon: DollarSign, description: 'Expense tracking' },
          { name: 'Reports', href: '/reports', icon: BarChart3, description: 'Daily reports' },
          { name: 'Analytics', href: '/analytics', icon: TrendingUp, description: 'Business insights' },
        ];
      case 'Kitchen':
        return [
          ...commonItems,
          { name: 'Kitchen Orders', href: '/orders', icon: ChefHat, description: 'Kitchen dashboard' },
        ];
      default:
        return [
          ...commonItems,
          { name: 'Orders', href: '/orders', icon: ClipboardList, description: 'View orders' },
        ];
    }
  };

  const navigationItems = getNavigationItems();

  const isActiveRoute = (href: string) => {
    if (href === '/' && location.pathname === '/') return true;
    if (href !== '/' && location.pathname.startsWith(href)) return true;
    return false;
  };

  const NavigationItems = ({ onItemClick }: { onItemClick?: () => void }) => (
    <ul className="space-y-1">
      {navigationItems.map((item) => (
        <li key={item.name}>
          <Link
            to={item.href}
            onClick={onItemClick}
            className={`flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 group touch-target ${
              isActiveRoute(item.href)
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-foreground hover:bg-accent hover:text-accent-foreground'
            }`}
          >
            <item.icon className={`h-5 w-5 transition-transform duration-200 ${
              isActiveRoute(item.href) ? 'scale-110' : 'group-hover:scale-105'
            }`} />
            <div className="flex-1 min-w-0">
              <span className="truncate">{item.name}</span>
              <p className="text-xs opacity-70 truncate mt-0.5 hidden lg:block">
                {item.description}
              </p>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Left Section */}
            <div className="flex items-center space-x-4">
              {/* Mobile Menu Trigger */}
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="md:hidden touch-target"
                  >
                    <HamburgerIcon className="h-5 w-5" />
                    <span className="sr-only">Toggle navigation menu</span>
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-80 sm:w-96">
                  <SheetHeader>
                    <SheetTitle className="flex items-center space-x-2">
                      <ChefHat className="h-6 w-6 text-primary" />
                      <span>Restaurant Pro</span>
                    </SheetTitle>
                  </SheetHeader>
                  <div className="mt-6">
                    <div className="flex items-center space-x-3 p-4 rounded-lg bg-accent/50 mb-6">
                      <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                        <User className="h-5 w-5 text-primary-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{user?.name}</p>
                        <p className="text-xs text-muted-foreground">{user?.role}</p>
                      </div>
                    </div>
                    <NavigationItems onItemClick={() => setMobileMenuOpen(false)} />
                  </div>  
                </SheetContent>
              </Sheet>

              {/* Logo */}
              <Link to="/" className="flex items-center space-x-0">
                {/* <ChefHat className="h-8 w-8 text-primary" /> */}
                <img src="OOR.png" alt="logo" className='h-20 w-20 ' />
                <div className="hidden sm:block">
                  <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                    Restaurant Pro
                  </h1>
                  <p className="text-xs text-muted-foreground -mt-1">Management System</p>
                </div>
              </Link>
            </div>

            {/* Right Section */}
            <div className="flex items-center space-x-2">
              {/* Notifications */}
              <Button variant="ghost" size="sm" className="touch-target">
                <Bell className="h-5 w-5" />
                <span className="sr-only">Notifications</span>
              </Button>

              {/* Theme Toggle */}
              <ThemeToggle />

              {/* User Menu */}
              <div className="relative">
                <Button 
                  variant="ghost" 
                  className="relative h-10 w-10 rounded-full touch-target"
                  onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                >
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                    <User className="h-4 w-4 text-primary-foreground" />
                  </div>
                </Button>
                
                {/* Custom Dropdown */}
                {profileMenuOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setProfileMenuOpen(false)}
                    />
                    <div className="absolute right-0 top-full mt-2 w-56 z-50 bg-popover border rounded-md shadow-md">
                      <div className="flex items-center space-x-2 p-3 border-b">
                        <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                          <User className="h-4 w-4 text-primary-foreground" />
                        </div>
                        <div className="flex flex-col space-y-1">
                          <p className="text-sm font-medium">{user?.name}</p>
                          <p className="text-xs text-muted-foreground">{user?.role}</p>
                        </div>
                      </div>
                      
                      <div className="p-1">
                        <Link 
                          to="/profile"
                          onClick={() => setProfileMenuOpen(false)}
                          className="flex items-center px-2 py-1.5 text-sm rounded-sm hover:bg-accent cursor-pointer"
                        >
                          <Settings className="mr-2 h-4 w-4" />
                          <span>Profile Settings</span>
                        </Link>
                        
                        <button 
                          onClick={() => {
                            setProfileMenuOpen(false);
                            logout();
                          }}
                          className="w-full flex items-center px-2 py-1.5 text-sm rounded-sm hover:bg-accent cursor-pointer text-destructive mt-1"
                        >
                          <LogOut className="mr-2 h-4 w-4" />
                          <span>Sign out</span>
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Desktop Sidebar */}
        <aside className="hidden md:flex md:w-72 lg:w-80 xl:w-72 bg-card border-r flex-col">
          <div className="flex-1 overflow-y-auto py-6">
            <div className="px-4 space-y-6">
              {/* User Card */}
              <div className="flex items-center space-x-3 p-4 rounded-lg bg-accent/50">
                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
                  <User className="h-5 w-5 text-primary-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{user?.name}</p>
                  <p className="text-xs text-muted-foreground">{user?.role}</p>
                </div>
              </div>

              {/* Navigation */}
              <nav>
                <NavigationItems />
              </nav>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-x-hidden">
          <div className="p-4 sm:p-6 lg:p-8 animate-fade-in">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;