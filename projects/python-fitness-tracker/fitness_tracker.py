import time  # lets us measure time (for jumps and reps)
import csv   # lets us write and read CSV files
from datetime import datetime  # lets us get the current date and time


# Gravity constants (m/s^2)
gEarth = 9.81  # gravity on Earth
gMoon = 1.62   # gravity on the Moon
gMars = 3.71   # gravity on Mars

logFile = "Gym App.csv"  # name of the CSV file where we store all results

# Global unit settings
weightUnit = "lb"   # default weight unit (pounds)
heightUnit = "cm"   # default height unit (centimeters)

# Rep timing targets for concentric phase (seconds)
repTargets = {  # dictionary mapping exercise names to (lowTime, highTime)
    "squat":       (0.7, 0.8),   # target time range for squat up phase
    "bench press": (0.8, 1.2),   # target time range for bench press up phase
    "deadlift":    (0.8, 1.5),   # target time range for deadlift up phase
    "biceps curl": (1.0, 1.5)    # target time range for biceps curl up phase
}


def initLogFile():  # function to create the CSV file with a header if it doesn't exist
    try:  # try to open the file to see if it already exists
        with open(logFile, "r") as f:  # open the log file in read mode
            pass  # do nothing, just checking if the file opens
    except FileNotFoundError:  # if the file does not exist
        with open(logFile, "w", newline="") as f:  # open the log file in write mode (create it)
            writer = csv.writer(f)  # create a CSV writer object
            writer.writerow([       # write the header row with column names
                "Date&Time",         # when the record was created
                "Plan Type",             # training plan used
                "Activity Name",         # type of activity (jump, rep, etc.)
                "Exercise Name",         # exercise name
                "Current Weight",   # current working weight
                "Next Weight",      # suggested next working weight
                "Weight Unit",      # unit of weight (lb or kg)
                "Hang Time in s",      # hang time for jumps
                "Jump Height",      # jump height in chosen height unit
                "Height Unit",      # unit for height (cm or in)
                "Rep Time in s",       # rep time in seconds
                "Notes"             # extra comments or suggestions
            ])


def logRow(plan, activity, exercise="", currentWeight="",  # function to add one row to the log file
           nextWeight="", hangTimeS="", jumpHeight="",     # parameters are stored as strings in CSV
           repTimeS="", notes=""):
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")  # get current date and time formatted as a string
    with open(logFile, "a", newline="") as f:           # open the log file in append mode
        writer = csv.writer(f)                          # create a CSV writer
        writer.writerow([                               # write one row with all the values
            now,                                        # datetime column
            plan,                                       # plan column
            activity,                                   # activity column
            exercise,                                   # exercise column
            currentWeight,                              # current_weight column
            nextWeight,                                 # next_weight column
            weightUnit,                                 # weight_unit column (global variable)
            hangTimeS,                                  # hang_time_s column
            jumpHeight,                                 # jump_height column
            heightUnit,                                 # height_unit column (global variable)
            repTimeS,                                   # rep_time_s column
            notes                                       # notes column
        ])


def chooseUnits():  # function to let the user select weight and height units
    global weightUnit, heightUnit  # tell Python we want to modify the global variables

    # Weight unit
    while True:  # loop until the user enters a valid choice
        print("\n=== Choose weight unit ===")  # show weight unit menu
        print("1) Pounds (lb)")       # option 1
        print("2) Kilograms (kg)")    # option 2
        choice = input("Your choice (Enter 1 or 2): ") 
        if choice == "1":             # if the user chose 1
            weightUnit = "lb"         # set weight unit to pounds
            break                     # break the loop
        elif choice == "2":           # if the user chose 2
            weightUnit = "kg"         # set weight unit to kilograms
            break                     # break the loop
        else:                         # if the user entered something else
            print("Invalid choice. Try again.")  # show an error message

    # Height unit
    while True:  # loop until the user enters a valid choice
        print("\n===Choose height unit===")  # show height unit menu
        print("1) Centimeters (cm)")    # option 1
        print("2) Inches (in)")         # option 2
        choice = input("Your choice (Enter 1 or 2): ").strip()  # read user input and strip spaces
        if choice == "1":               # if choice is 1
            heightUnit = "cm"           # set height unit to centimeters
            break                       # break loop
        elif choice == "2":             # if choice is 2
            heightUnit = "in"           # set height unit to inches
            break                       # break loop
        else:                           # invalid option
            print("Invalid choice. Try again.")  # error message

    print(f"\nUnits set: weight in {weightUnit}, height in {heightUnit}.")  # confirm chosen units


def chooseTrainingPlan():  # function to let the user pick a training plan
    print("\n=== Choose Training Plan ===")  # title for this section
    print("1) Conservative")                # plan option 1
    print("2) Standard")                    # plan option 2
    print("3) Aggressive")                  # plan option 3
    while True:                             # loop until valid choice
        choice = input("Your choice (1/2/3): ")
        if choice == "1":                   # if user chose 1
            return "Conservative"           # return name of plan
        if choice == "2":                   # if user chose 2
            return "Standard"               # return name of plan
        if choice == "3":                   # if user chose 3
            return "Aggressive"             # return name of plan
        print("Invalid choice. Try again.") # otherwise ask again


def convertHeightForDisplay(heightMeters):  # function to convert meters into chosen height unit
    if heightUnit == "cm":                 # if user chose centimeters
        return heightMeters * 100.0       # convert meters to centimeters
    elif heightUnit == "in":              # if user chose inches
        return heightMeters / 0.0254      # convert meters to inches (1 inch = 0.0254 m)
    else:                                 # fallback (should not happen)
        return heightMeters               # return meters directly if no valid unit


def measureJump(planName):  # function to measure vertical jump using hang time
    print("\n=== Measure Vertical Jump ===")                 # section title
    print("When the athlete's feet leave the ground press Enter.")          # instruction for user
    input("Ready? \nPress Enter when the athlete JUMPS...")             # wait for user to jump and press Enter
    startTime = time.time()                                  # record time at jump

    input("Press Enter again when the athlete LANDS...")              # wait for landing and Enter press
    endTime = time.time()                                    # record time at landing

    hangTime = endTime - startTime                           # calculate hang time in seconds
    print(f"\nHang time: {hangTime:.3f} seconds")            # print hang time with 3 decimals

    # Takeoff speed using Earth gravity
    v = gEarth * hangTime / 2                                # compute takeoff velocity from hang time

    # Heights in meters
    hEarthM = v * v / (2 * gEarth)                           # jump height on Earth in meters
    hMoonM = v * v / (2 * gMoon)                             # jump height on Moon in meters
    hMarsM = v * v / (2 * gMars)                             # jump height on Mars in meters

    # Convert for display in chosen unit
    hEarth = convertHeightForDisplay(hEarthM)                # convert Earth height to chosen unit
    hMoon = convertHeightForDisplay(hMoonM)                  # convert Moon height to chosen unit
    hMars = convertHeightForDisplay(hMarsM)                  # convert Mars height to chosen unit

    print("\nEstimated jump height:")                        # heading for heights
    print(f"- Earth: {hEarth:.1f} {heightUnit}")             # print Earth height with unit
    print(f"- Moon:  {hMoon:.1f} {heightUnit}")              # print Moon height with unit
    print(f"- Mars:  {hMars:.1f} {heightUnit}")              # print Mars height with unit

    # Store Earth height in chosen unit; add others in notes
    notes = f"Moon={hMoon:.1f}{heightUnit}, Mars={hMars:.1f}{heightUnit}"  # create notes text
    logRow(                                                          # log the jump in the CSV
        plan=planName,                                               # training plan used
        activity="Vertical Jump",                                    # activity name
        exercise="Jump",                                             # exercise type
        hangTimeS=f"{hangTime:.3f}",                                 # hang time as string
        jumpHeight=f"{hEarth:.1f}",                                  # Earth height as string
        notes=notes                                                  # notes with Moon and Mars heights
    )


def suggestNextWeight(planName):  # function to suggest the next set weight
    print("\n=== Next Set Weight Suggestion ===")                  # section title
    exercise = input("Exercise name (e.g. Squat, Bench): ").strip()  # ask user which exercise

    try:                                                         # try to convert input weight to float
        current = float(input(f"Weight used on last set ({weightUnit}): "))  # read current weight
    except ValueError:                                           # if conversion fails
        print("Invalid input. Please enter a number for weight.")  # show error message
        return                                                   # exit function early

    # Fixed increase depends on unit
    if weightUnit == "lb":                                       # if using pounds
        baseAdd = 5.0                                            # add 5 pounds for conservative plan
    else:  # kg                                                  # if using kilograms
        baseAdd = 2.5                                            # add 2.5 kg for conservative plan

    if planName == "Conservative":                               # if user chose conservative plan
        nextW = current + baseAdd                                # next weight is current + fixed add
    elif planName == "Standard":                                 # if standard plan
        nextW = current * 1.10                                   # increase by 10 percent
    else:  # Aggressive                                          # otherwise aggressive plan
        nextW = current * 1.15                                   # increase by 15 percent

    print(f"\nPlan: {planName}")                                 # print chosen plan
    print(f"Exercise: {exercise}")                               # print exercise name
    print(f"Current weight: {current:.1f} {weightUnit}")         # show current weight
    print(f"Suggested next set: {nextW:.1f} {weightUnit}")       # show suggested next weight

    logRow(                                                      # store this suggestion in CSV
        plan=planName,                                           # plan used
        activity="Weight Suggestion",                            # activity type
        exercise=exercise,                                       # exercise name
        currentWeight=f"{current:.1f}",                          # current weight as string
        nextWeight=f"{nextW:.1f}",                               # suggested weight as string
        notes="Auto suggestion based on plan"                    # short note
    )


def timeRep(planName):  # function to time a single rep and suggest weight adjustment
    print("\n=== Time a Rep ===")  # section title
    exercise = input("Exercise name (e.g. Squat, Bench Press, Deadlift, Biceps Curl): ")
    exerciseKey = exercise.lower()  # convert to lowercase to match keys in repTargets

    if exerciseKey in repTargets:                     # if this exercise has a specific time range
        lowTarget, highTarget = repTargets[exerciseKey]  # get target (low, high) from dictionary
    else:                                             # if exercise not listed
        # Generic target if exercise is not in the dictionary
        lowTarget, highTarget = (0.8, 1.5)            # use a generic timing range

    try:                                              # try to read current working weight
        current = float(input(f"Current working weight ({weightUnit}): "))  # ask for current weight
    except ValueError:                                # if not a number
        print("Invalid input. Please enter a number for weight.")  # error message
        return                                        # exit function

    print("Press Enter at the start of the concentric phase (e.g. bottom of squat).")  # instruction
    input("Then press Enter again at the top of the rep...")                            # prompt before timing

    startTime = time.time()  # record starting time when concentric starts
    input()                  # wait for Enter at the top of the rep
    endTime = time.time()    # record end time when rep finishes

    repTime = endTime - startTime                      # calculate rep duration in seconds
    print(f"\nRep time: {repTime:.3f} seconds")        # show rep time

    # Decide feedback and weight change suggestion
    if lowTarget <= repTime <= highTarget:             # if rep time is within target range
        message = "Nice rep, tempo is in the target range. Keep the same weight."  # positive feedback
        nextW = current                                # keep the same weight
    elif repTime < lowTarget:                          # if rep is faster than target (too fast)
        # Too fast -> probably too light
        if planName == "Conservative":                 # adjust factor by plan
            factor = 1.025                             # small increase for conservative plan
        elif planName == "Standard":
            factor = 1.05                              # moderate increase for standard plan
        else:  # Aggressive
            factor = 1.075                             # larger increase for aggressive plan
        nextW = current * factor                       # compute suggested next weight
        message = "Rep was faster than target. You can probably increase the weight a bit."  # feedback
    else:  # repTime > highTarget                      # if rep is slower than target (too slow)
        # Too slow -> probably too heavy
        if planName == "Conservative":                 # adjust factor by plan
            factor = 0.975                             # small decrease for conservative plan
        elif planName == "Standard":
            factor = 0.95                              # moderate decrease for standard plan
        else:  # Aggressive
            factor = 0.925                             # larger decrease for aggressive plan
        nextW = current * factor                       # compute suggested lighter weight
        message = "Rep was slower than target. Consider reducing the weight slightly."  # feedback

    print(message)                                     # print feedback message
    print(f"Suggested next weight: {nextW:.1f} {weightUnit}")  # show suggested next weight

    logRow(                                            # save the rep timing result to CSV
        plan=planName,                                 # plan name
        activity="Rep Timing",                         # activity type
        exercise=exercise,                             # exercise name
        currentWeight=f"{current:.1f}",                # current weight as string
        nextWeight=f"{nextW:.1f}",                     # suggested weight as string
        repTimeS=f"{repTime:.3f}",                     # rep time as string
        notes=message)                                  # feedback message


def mainMenu(planName):  # function to show the main menu and handle choices
    while True:  # keep showing the menu until the user quits
        print("\n=== Main Menu ===")                    # menu title
        print(f"Current plan: {planName}")              # show active training plan
        print("1) Measure vertical jump")               # option 1
        print("2) Get next-set weight suggestion")      # option 2
        print("3) Time a rep")                          # option 3
        print("4) Change training plan")                # option 4
        print("5) Quit")                                # option 5

        choice = input("Choose (1-5): ")

        if choice == "1":                               # if user chose 1
            measureJump(planName)                       # call measureJump with current plan
        elif choice == "2":                             # if user chose 2
            suggestNextWeight(planName)                 # call suggestNextWeight with current plan
        elif choice == "3":                             # if user chose 3
            timeRep(planName)                           # call timeRep with current plan
        elif choice == "4":                             # if user chose 4
            planName = chooseTrainingPlan()             # let user pick a new training plan
        elif choice == "5":                             # if user chose 5
            print("Good job today. Bye!")               # farewell message
            break                                       # exit the loop and end the menu
        else:                                           # any other input
            print("Invalid choice. Try again.")         # ask again


def main():  # main function that starts the app
    print("Welcome to the Training Assistant App")  # greeting message
    initLogFile()                                # make sure the log file exists with header
    chooseUnits()                                # let the user choose weight and height units
    planName = chooseTrainingPlan()              # let the user choose the initial training plan
    mainMenu(planName)                           # start the main menu loop with this plan


if __name__ == "__main__":  # only run main() if this file is executed directly
    main()                  # call the main function