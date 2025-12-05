// Pages/Index.cshtml.cs
using Microsoft.AspNetCore.Mvc.RazorPages;

namespace QuickToolbox.Pages
{
    public class IndexModel : PageModel
    {
        public List<Category> Categories { get; set; } = new();

        public void OnGet()
        {
            Categories = new List<Category>
{
    new Category
    {
        Name = "Text tools",
        Key = "text",
        Description = "Clean up, analyse and generate text for writing, blogging and development.",
        Tools = new List<ToolInfo>
        {
            new ToolInfo
            {
                Name = "Word Counter",
                Url = "/Tools/WordCounter",
                Tagline = "Count words, characters and lines as you type."
            },
            new ToolInfo
            {
                Name = "Text Formatter",
                Url = "/Tools/TextFormatter",
                Tagline = "Tidy messy text by fixing spacing, line breaks and punctuation."
            }
        }
    },

    new Category
    {
        Name = "Design & theme tools",
        Key = "design",
        Description = "Quick helpers for colours, themes and interface previews.",
        Tools = new List<ToolInfo>
        {
            new ToolInfo
            {
                Name = "Colour Palette Generator",
                Url = "/Tools/ColourPalette",
                Tagline = "Build harmonious colour palettes from a single base colour."
            },
            new ToolInfo
            {
                Name = "Theme Preview",
                Url = "/Tools/ThemePreview",
                Tagline = "Preview and compare theme colours and styles side by side."
            },
            new ToolInfo
            {
                Name = "Typography Scale Generator",
                Url = "/Tools/TypographyScaleGenerator",
                Tagline = "Generate responsive font scales for headings and body text."
            }
        }
    },

    new Category
    {
        Name = "Finance tools",
        Key = "finance",
        Description = "Quick calculators for everyday money decisions.",
        Tools = new List<ToolInfo>
        {
            new ToolInfo
            {
                Name = "Loan Calculator",
                Url = "/Tools/LoanCalculator",
                Tagline = "Work out repayments, interest and payoff time."
            },
            new ToolInfo
            {
                Name = "Savings Calculator",
                Url = "/Tools/SavingsCalculator",
                Tagline = "See how monthly saving grows over time."
            },
            new ToolInfo
            {
                Name = "Percentage Difference",
                Url = "/Tools/PercentageDifference",
                Tagline = "Calculate percentage change, discounts and differences."
            }
        }
    },

    new Category
    {
        Name = "Planning & time",
        Key = "planning",
        Description = "Tools that make scheduling and coordination less painful.",
        Tools = new List<ToolInfo>
        {
            new ToolInfo
            {
                Name = "Time Zone Meeting Finder",
                Url = "/Tools/TimeZoneMeetingFinder",
                Tagline = "Find meeting times that work across multiple time zones."
            }
        }
    },

    new Category
    {
        Name = "Randomisers & teams",
        Key = "randomisers",
        Description = "Handy utilities for teams, fixtures and fair random choices.",
        Tools = new List<ToolInfo>
        {
            new ToolInfo
            {
                Name = "Team Randomiser",
                Url = "/Tools/TeamRandomiser",
                Tagline = "Shuffle people into random teams in one click."
            },
            new ToolInfo
            {
                Name = "Tournament Generator",
                Url = "/Tools/Tournament",
                Tagline = "Create simple tournament brackets and match-ups."
            },
            new ToolInfo
            {
                Name = "League Table",
                Url = "/Tools/League",
                Tagline = "Set up league tables and track standings."
            }
        }
    }
};


        }

        public class Category
        {
            public string Name { get; set; } = "";
            public string Key { get; set; } = "";       // for IDs / anchors if you want them
            public string Description { get; set; } = "";
            public List<ToolInfo> Tools { get; set; } = new();
        }

        public class ToolInfo
        {
            public string Name { get; set; } = "";
            public string Url { get; set; } = "";
            public string? Tagline { get; set; }
        }
    }
}
